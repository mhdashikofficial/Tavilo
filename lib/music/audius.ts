import { Track } from '@/types/music';

const AUDIUS_API_BASE = 'https://api.audius.co';
const APP_NAME = 'TAVILO';

interface AudiusRawTrack {
  id: string;
  title: string;
  user?: {
    name?: string;
  };
  genre?: string;
  mood?: string;
  duration?: number;
  artwork?: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  release_date?: string;
  bpm?: number;
}

export function normalizeAudiusTrack(raw: AudiusRawTrack): Track {
  const artwork =
    raw.artwork?.['480x480'] ||
    raw.artwork?.['1000x1000'] ||
    raw.artwork?.['150x150'] ||
    'https://i.ytimg.com/vi/60ItHLz5WEA/hqdefault.jpg';

  const genre = raw.genre || 'Indie';
  const moods: string[] = [];
  if (raw.mood) {
    moods.push(raw.mood);
  }

  return {
    id: `audius-${raw.id}`,
    providerId: 'audius',
    providerName: 'Audius Open Network',
    title: raw.title || 'Untitled Track',
    artist: raw.user?.name || 'Unknown Artist',
    artists: raw.user?.name ? [raw.user.name] : [],
    album: 'Audius Release',
    artwork,
    duration: raw.duration || 180,
    streamUrl: `${AUDIUS_API_BASE}/v1/tracks/${raw.id}/stream?app_name=${APP_NAME}`,
    genre,
    genres: [genre],
    moods,
    playbackCapability: 'playable',
    playbackSource: 'Audius Stream API',
    licenseName: 'Community Open Stream',
    licenseUrl: 'https://audius.co',
    releasedDate: raw.release_date,
    bpm: raw.bpm,
  };
}

export async function fetchAudiusTrending(limit: number = 20): Promise<Track[]> {
  try {
    const res = await fetch(`${AUDIUS_API_BASE}/v1/tracks/trending?app_name=${APP_NAME}&limit=${limit}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.warn('Audius trending request failed with status:', res.status);
      return [];
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    return data.data.map(normalizeAudiusTrack);
  } catch (err) {
    console.error('Failed to fetch Audius trending:', err);
    return [];
  }
}

export async function fetchAudiusTrendingByGenre(genre: string, limit: number = 20): Promise<Track[]> {
  try {
    const res = await fetch(
      `${AUDIUS_API_BASE}/v1/tracks/trending?genre=${encodeURIComponent(genre)}&app_name=${APP_NAME}&limit=${limit}`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    return data.data.map(normalizeAudiusTrack);
  } catch (err) {
    console.warn(`Failed to fetch Audius trending for genre ${genre}:`, err);
    return [];
  }
}

export async function searchAudiusTracks(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const res = await fetch(
      `${AUDIUS_API_BASE}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}&limit=${limit}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) {
      console.warn('Audius search request failed with status:', res.status);
      return [];
    }
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    return data.data.map(normalizeAudiusTrack);
  } catch (err) {
    console.error('Failed to search Audius:', err);
    return [];
  }
}

export async function fetchAudiusTrackById(trackId: string): Promise<Track | null> {
  const cleanId = trackId.replace(/^audius-/, '');
  try {
    const res = await fetch(`${AUDIUS_API_BASE}/v1/tracks/${cleanId}?app_name=${APP_NAME}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data) return null;
    return normalizeAudiusTrack(data.data);
  } catch (err) {
    console.error('Failed to fetch Audius track:', err);
    return null;
  }
}
