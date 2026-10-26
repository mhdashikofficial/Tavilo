import { Track, SearchResult, Playlist, Artist, Album, UserPreferences } from '@/types/music';
import { SEED_TRACKS, CURATED_PLAYLISTS, MOOD_CATEGORIES } from './seed';
import { fetchAudiusTrending, searchAudiusTracks, fetchAudiusTrackById, fetchAudiusTrendingByGenre } from './audius';
import { searchJamendo, isJamendoConfigured } from './jamendo';
import { searchYouTube } from './youtube';
import { getSonicProfileForTrack, isMalayalamTrack } from '@/lib/recommendations/sonicGraph';

export class MusicProviderService {
  /**
   * Returns trending tracks (combining YouTube live trending + curated high quality catalog)
   */
  public static async getTrending(limit: number = 24): Promise<Track[]> {
    try {
      const half = Math.ceil(limit / 2);
      const [mal, eng] = await Promise.all([
        searchYouTube('latest trending malayalam songs official video', half),
        searchYouTube('trending english songs billboard hot official video', half),
      ]);
      const blended = [...mal, ...eng];
      if (blended.length > 0) return blended.slice(0, limit);
    } catch (err) {
      console.warn('Error fetching live trending, falling back to seed catalog:', err);
    }
    return SEED_TRACKS.slice(0, limit);
  }

  /**
   * Returns trending tracks categorized by Malayalam, English, Viral, or global blend from YouTube
   */
  public static async getTrendingByCategory(
    category: 'malayalam' | 'english' | 'viral' | 'all' = 'all',
    limit: number = 12
  ): Promise<Track[]> {
    try {
      if (category === 'malayalam') {
        const yt = await searchYouTube('latest trending malayalam songs official video', limit);
        if (yt.length > 0) return yt;
      } else if (category === 'english') {
        const yt = await searchYouTube('trending english songs billboard hot official video', limit);
        if (yt.length > 0) return yt;
      } else if (category === 'viral') {
        const yt = await searchYouTube('trending viral songs anirudh south indian bollywood official video', limit);
        if (yt.length > 0) return yt;
      } else {
        const third = Math.ceil(limit / 3);
        const [mal, eng, vir] = await Promise.all([
          searchYouTube('latest trending malayalam songs official video', third),
          searchYouTube('trending english songs billboard hot official video', third),
          searchYouTube('trending viral songs anirudh south indian bollywood official video', third),
        ]);
        const blended = [...mal, ...eng, ...vir];
        if (blended.length > 0) return blended.slice(0, limit);
      }
    } catch (err) {
      console.warn('Error fetching YouTube trending category:', err);
    }
    return this.getTrending(limit);
  }

  /**
   * Retrieves high-relevance candidates tailored specifically to the sonic DNA of the playing track
   */
  public static async getTailoredCandidates(currentTrack: Track, preferences?: UserPreferences): Promise<Track[]> {
    const isMalayalam = isMalayalamTrack(currentTrack);

    // If playing a Malayalam song, focus 100% on YouTube Malayalam queries
    if (isMalayalam) {
      const cleanArtist = currentTrack.artist.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      const cleanTitle = currentTrack.title.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

      const ytQueries: Promise<Track[]>[] = [
        searchYouTube(`${cleanArtist} malayalam songs official video`, 12),
        searchYouTube('latest trending malayalam songs official video', 15),
        searchYouTube('top hit malayalam movie video songs', 12),
        searchYouTube('malayalam cinema melodies official video', 10),
      ];

      if (cleanTitle.length > 3) {
        ytQueries.push(searchYouTube(`${cleanTitle} malayalam song`, 8));
      }

      const settled = await Promise.allSettled(ytQueries);
      const candidates: Track[] = [];
      settled.forEach(s => {
        if (s.status === 'fulfilled' && Array.isArray(s.value)) {
          candidates.push(...s.value);
        }
      });

      // Filter to ensure candidate pool is strictly Malayalam
      const malayalamCandidates = candidates.filter(t => isMalayalamTrack(t) || t.id.startsWith('yt-'));
      const seedMalayalam = SEED_TRACKS.filter(t => isMalayalamTrack(t) && t.id !== currentTrack.id);

      const trackMap = new Map<string, Track>();
      for (const t of [...malayalamCandidates, ...seedMalayalam]) {
        if (t.id === currentTrack.id) continue;
        const key = `${t.title.toLowerCase()} - ${t.artist.toLowerCase()}`;
        if (!trackMap.has(key)) {
          trackMap.set(key, t);
        }
      }

      return Array.from(trackMap.values());
    }

    // For other genres (e.g. English Pop, Electronic, Rock), query YouTube + tailored seeds
    const profile = getSonicProfileForTrack(currentTrack.title, currentTrack.artist, currentTrack.genre);
    const queries: Promise<Track[]>[] = [
      searchYouTube(`${currentTrack.artist} songs official video`, 10),
    ];

    if (profile.searchSeeds && profile.searchSeeds.length > 0) {
      queries.push(searchYouTube(`${profile.searchSeeds[0]} songs official video`, 10));
      if (profile.searchSeeds[1]) {
        queries.push(searchYouTube(`${profile.searchSeeds[1]} songs official video`, 8));
      }
    }

    queries.push(searchYouTube('trending english songs billboard hot official video', 8));

    const settled = await Promise.allSettled(queries);
    const liveTracks: Track[] = [];
    settled.forEach(s => {
      if (s.status === 'fulfilled' && Array.isArray(s.value)) {
        liveTracks.push(...s.value);
      }
    });

    const compatibleSeed = SEED_TRACKS.filter(t => {
      if (t.id === currentTrack.id) return false;
      return profile.compatibleGenres.some(
        cg =>
          cg.toLowerCase() === (t.genre || '').toLowerCase() ||
          t.genres?.some(tg => tg.toLowerCase() === cg.toLowerCase())
      );
    });

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

    // 1. Search YouTube catalog
    let youtubeResults: Track[] = [];
    try {
      youtubeResults = await searchYouTube(query, limit);
    } catch (err) {
      console.warn('YouTube search error:', err);
    }

    // 2. Search local seed tracks
    const matchedSeedTracks = SEED_TRACKS.filter(t => 
      t.title.toLowerCase().includes(qLower) ||
      t.artist.toLowerCase().includes(qLower) ||
      t.genre?.toLowerCase().includes(qLower) ||
      t.album.toLowerCase().includes(qLower) ||
      t.moods?.some(m => m.toLowerCase().includes(qLower))
    );

    // 3. Search Audius live catalog
    let audiusResults: Track[] = [];
    try {
      audiusResults = await searchAudiusTracks(query, limit);
    } catch (err) {
      console.warn('Audius search error:', err);
    }

    // 4. Search Jamendo if configured
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
    for (const t of [...youtubeResults, ...matchedSeedTracks, ...audiusResults, ...jamendoResults]) {
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
   * Returns tracks for a specific mood category powered by YouTube Music
   */
  public static async getTracksByMood(mood: string, limit: number = 20): Promise<Track[]> {
    const mLower = mood.toLowerCase().trim();
    
    const MOOD_QUERIES: Record<string, string> = {
      chill: 'chill lofi beats relaxing songs official video',
      focus: 'deep focus study instrumental music',
      workout: 'workout motivation gym workout music songs',
      sleep: 'deep sleep relaxing ambient music',
      'night-drive': 'night drive synthwave phonk songs official video',
      romantic: 'romantic love songs acoustic official video',
      energetic: 'party dance energetic songs official video',
      acoustic: 'acoustic guitar singer songwriter songs official video',
      electronic: 'electronic dance music edm official video',
      instrumental: 'piano violin instrumental cinematic music',
    };

    try {
      const q = MOOD_QUERIES[mLower] || `${mood} music songs official video`;
      const ytTracks = await searchYouTube(q, limit);
      if (ytTracks.length > 0) {
        return ytTracks;
      }
    } catch (err) {
      console.warn('Error fetching YouTube mood tracks:', err);
    }

    // Check seed tracks matching mood
    const seedMatches = SEED_TRACKS.filter(t =>
      t.moods?.some(m => m.toLowerCase().includes(mLower)) ||
      t.genre?.toLowerCase().includes(mLower)
    );

    return seedMatches.length > 0 ? seedMatches : SEED_TRACKS.slice(0, limit);
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

    if (id.startsWith('yt-')) {
      const videoId = id.replace('yt-', '');
      return {
        id,
        providerId: 'youtube',
        providerName: 'YouTube Music',
        title: 'YouTube Track',
        artist: 'YouTube Artist',
        album: 'YouTube Release',
        artwork: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 210,
        streamUrl: videoId,
        playbackCapability: 'playable',
        playbackSource: 'YouTube Official Embedded Player',
        licenseName: 'YouTube Standard License',
        licenseUrl: 'https://www.youtube.com/t/terms',
      };
    }

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
