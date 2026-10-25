import { Track, SearchResult, Playlist, Artist, Album, UserPreferences } from '@/types/music';
import { SEED_TRACKS, CURATED_PLAYLISTS, MOOD_CATEGORIES } from './seed';
import { fetchAudiusTrending, searchAudiusTracks, fetchAudiusTrackById, fetchAudiusTrendingByGenre } from './audius';
import { searchJamendo, isJamendoConfigured } from './jamendo';
import { getSonicProfileForTrack } from '@/lib/recommendations/sonicGraph';

export class MusicProviderService {
  /**
   * Returns trending tracks (combining Audius live trending + curated high quality catalog)
   */
  public static async getTrending(limit: number = 24): Promise<Track[]> {
    try {
      const audiusTracks = await fetchAudiusTrending(limit);
      if (audiusTracks.length > 0) {
        // Interleave top seed tracks to ensure diverse instant audio
        const combined = [...SEED_TRACKS.slice(0, 4), ...audiusTracks];
        return combined.slice(0, limit);
      }
    } catch (err) {
      console.warn('Error fetching live trending, falling back to seed catalog:', err);
    }
    return SEED_TRACKS;
  }

  /**
   * Retrieves high-relevance candidates tailored specifically to the sonic DNA of the playing track
   */
  public static async getTailoredCandidates(currentTrack: Track, preferences?: UserPreferences): Promise<Track[]> {
    const profile = getSonicProfileForTrack(currentTrack.title, currentTrack.artist, currentTrack.genre);
    const queries: Promise<Track[]>[] = [];

    // 1. Search for tracks by the artist / landmark keywords
    queries.push(searchAudiusTracks(currentTrack.artist, 6));

    // 2. Search for tracks using primary and secondary search seeds from sonic profile
    if (profile.searchSeeds && profile.searchSeeds.length > 0) {
      queries.push(searchAudiusTracks(profile.searchSeeds[0], 8));
      if (profile.searchSeeds[1]) {
        queries.push(searchAudiusTracks(profile.searchSeeds[1], 6));
      }
    }

    // 3. Fetch trending within the primary genre channel
    queries.push(fetchAudiusTrendingByGenre(profile.primaryGenre, 8));

    // 4. Fetch trending within 1st-degree compatible genre channel
    if (profile.compatibleGenres && profile.compatibleGenres.length > 1) {
      const secondGenre = profile.compatibleGenres.find(
        g => g.toLowerCase() !== profile.primaryGenre.toLowerCase()
      );
      if (secondGenre) {
        queries.push(fetchAudiusTrendingByGenre(secondGenre, 8));
      }
    }

    // Execute parallel retrieval
    const settled = await Promise.allSettled(queries);
    const liveTracks: Track[] = [];
    settled.forEach(s => {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) {
        liveTracks.push(...s.value);
      }
    });

    // 5. Match local seed tracks that share compatible genres and acoustic type
    const compatibleSeed = SEED_TRACKS.filter(t => {
      if (t.id === currentTrack.id) return false;
      const gMatch = profile.compatibleGenres.some(
        cg =>
          cg.toLowerCase() === (t.genre || '').toLowerCase() ||
          t.genres?.some(tg => tg.toLowerCase() === cg.toLowerCase())
      );
      return gMatch;
    });

    // Deduplicate all candidates
    const trackMap = new Map<string, Track>();
    for (const t of [...liveTracks, ...compatibleSeed]) {
      if (t.id === currentTrack.id) continue;
      const key = `${t.title.toLowerCase()} - ${t.artist.toLowerCase()}`;
      if (!trackMap.has(key)) {
        trackMap.set(key, t);
      }
    }

    return Array.from(trackMap.values());
  }

  /**
   * Search across all integrated providers (Audius, Jamendo, Seed)
   */
  public static async search(query: string, limit: number = 20): Promise<SearchResult> {
    const qLower = query.toLowerCase().trim();
    if (!qLower) {
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }

    // 1. Search local seed tracks
    const matchedSeedTracks = SEED_TRACKS.filter(t => 
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.genre?.toLowerCase().includes(qLower) ||
      t.album.toLowerCase().includes(qLower) ||
      t.moods?.some(m => m.toLowerCase().includes(qLower))
    );

    // 2. Search Audius live catalog
    let audiusResults: Track[] = [];
    try {
      audiusResults = await searchAudiusTracks(query, limit);
    } catch (err) {
      console.warn('Audius search error:', err);
    }

    // 3. Search Jamendo if configured
    let jamendoResults: Track[] = [];
    if (isJamendoConfigured()) {
      try {
        jamendoResults = await searchJamendo(query, limit);
      } catch (err) {
        console.warn('Jamendo search error:', err);
      }
    }

    // Deduplicate tracks by id and title+artist
    const trackMap = new Map<string, Track>();
    for (const t of [...matchedSeedTracks, ...audiusResults, ...jamendoResults]) {
      const key = `${t.title.toLowerCase()} - ${t.artist.toLowerCase()}`;
      if (!trackMap.has(key)) {
        trackMap.set(key, t);
      }
    }

    const tracks = Array.from(trackMap.values()).slice(0, limit);

    // Extract artists from tracks
    const artistMap = new Map<string, Artist>();
    tracks.forEach(t => {
      if (!artistMap.has(t.artist.toLowerCase())) {
        artistMap.set(t.artist.toLowerCase(), {
          id: `artist-${encodeURIComponent(t.artist.toLowerCase())}`,
          name: t.artist,
          image: t.artwork,
          genres: t.genres || [t.genre || 'Indie'],
          topTracks: tracks.filter(tr => tr.artist.toLowerCase() === t.artist.toLowerCase()),
        });
      }
    });

    // Extract albums from tracks
    const albumMap = new Map<string, Album>();
    tracks.forEach(t => {
      const albumKey = `${t.album.toLowerCase()}-${t.artist.toLowerCase()}`;
      if (!albumMap.has(albumKey)) {
        albumMap.set(albumKey, {
          id: `album-${encodeURIComponent(albumKey)}`,
          title: t.album,
          artist: t.artist,
          artwork: t.artwork,
          trackCount: tracks.filter(tr => tr.album === t.album).length,
          releasedDate: t.releasedDate,
          genre: t.genre,
        });
      }
    });

    // Match curated playlists
    const matchedPlaylists = CURATED_PLAYLISTS.filter(p =>
      p.title.toLowerCase().includes(qLower) ||
      p.description.toLowerCase().includes(qLower)
    );

    return {
      tracks,
      artists: Array.from(artistMap.values()).slice(0, 8),
      albums: Array.from(albumMap.values()).slice(0, 8),
      playlists: matchedPlaylists,
    };
  }

  /**
   * Returns tracks for a specific mood category
   */
  public static async getTracksByMood(mood: string, limit: number = 20): Promise<Track[]> {
    const mLower = mood.toLowerCase();
    
    // Check seed tracks matching mood
    const seedMatches = SEED_TRACKS.filter(t =>
      t.moods?.some(m => m.toLowerCase().includes(mLower)) ||
      t.genre?.toLowerCase().includes(mLower)
    );

    try {
      // Query Audius for the mood tag
      const liveMatches = await searchAudiusTracks(mood, limit);
      const combined = [...seedMatches, ...liveMatches];
      return combined.slice(0, limit);
    } catch {
      return seedMatches.length > 0 ? seedMatches : SEED_TRACKS.slice(0, limit);
    }
  }

  /**
   * Returns tracks for a genre
   */
  public static async getTracksByGenre(genre: string, limit: number = 20): Promise<Track[]> {
    return this.getTracksByMood(genre, limit);
  }

  /**
   * Get track by ID
   */
  public static async getTrackById(id: string): Promise<Track | null> {
    const seed = SEED_TRACKS.find(t => t.id === id);
    if (seed) return seed;

    if (id.startsWith('audius-')) {
      return fetchAudiusTrackById(id);
    }

    return null;
  }

  /**
   * Curated playlists
   */
  public static getCuratedPlaylists(): Playlist[] {
    return CURATED_PLAYLISTS;
  }

  /**
   * Mood categories list
   */
  public static getMoodCategories() {
    return MOOD_CATEGORIES;
  }
}
