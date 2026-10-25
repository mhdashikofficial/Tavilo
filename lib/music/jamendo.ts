import { Track } from '@/types/music';

const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID || '';
const JAMENDO_BASE_URL = 'https://api.jamendo.com/v3.0';

interface JamendoRawTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_name: string;
  album_id: string;
  license_ccurl: string;
  audio: string;
  audiodownload: string;
  image: string;
  musicinfo?: {
    tags?: {
      genres?: string[];
      instruments?: string[];
      vartags?: string[];
    };
  };
  releasedate?: string;
}

export function isJamendoConfigured(): boolean {
  return Boolean(JAMENDO_CLIENT_ID && JAMENDO_CLIENT_ID.trim().length > 0);
}

export function normalizeJamendoTrack(raw: JamendoRawTrack): Track {
  const genres = raw.musicinfo?.tags?.genres || ['Indie'];
  const vartags = raw.musicinfo?.tags?.vartags || [];
  const primaryGenre = genres[0] || 'Indie';

  return {
    id: `jamendo-${raw.id}`,
    providerId: 'jamendo',
    providerName: 'Jamendo Music',
    title: raw.name || 'Untitled Track',
    artist: raw.artist_name || 'Unknown Artist',
    artists: [raw.artist_name],
    album: raw.album_name || 'Single',
    artwork: raw.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    duration: raw.duration || 180,
    streamUrl: raw.audio,
    genre: primaryGenre,
    genres,
    moods: vartags,
    playbackCapability: 'playable',
    playbackSource: 'Jamendo Audio Stream',
    licenseName: 'Creative Commons License',
    licenseUrl: raw.license_ccurl || 'https://creativecommons.org/',
    releasedDate: raw.releasedate,
  };
}

export async function searchJamendo(query: string, limit: number = 20): Promise<Track[]> {
  if (!isJamendoConfigured()) return [];
  try {
    const url = `${JAMENDO_BASE_URL}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&namesearch=${encodeURIComponent(
      query
    )}&limit=${limit}&include=musicinfo`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];
    return data.results.map(normalizeJamendoTrack);
  } catch (err) {
    console.error('Jamendo search error:', err);
    return [];
  }
}
