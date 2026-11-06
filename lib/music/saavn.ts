import CryptoJS from 'crypto-js';
import { Track } from '@/types/music';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export function decryptSaavnMediaUrl(encryptedMediaUrl: string): string {
  if (!encryptedMediaUrl) return '';
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedMediaUrl) } as any,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const raw = decrypted.toString(CryptoJS.enc.Utf8);
    if (!raw || !raw.includes('.mp4')) return '';
    return raw
      .replace(/^http:\/\//i, 'https://')
      .replace(/_(?:96|160|48|12)\.mp4/i, '_320.mp4');
  } catch {
    return '';
  }
}

const FAKE_NOISE_REGEX = /\b(tribute|karaoke|originally performed by|made famous by|in the style of|instrumental version|cover version|backing track|unofficial remix|sound-?a-?like|sped\s*up|slowed\s*(?:remix|version)?|nightcore|reverb|lofi|lo-fi|chipmunk|8d\s*audio|bass\s*boosted|tiktok\s*version)\b/i;
const FAKE_ARTISTS = [
  'ultimate tribute stars',
  'karaoke hits',
  'karaoke universe',
  'sing2music',
  'ameritz',
  'wonderland',
  'the hit crew',
  'hit crew',
  'prosound karaoke',
  'cover pop',
  'midifine',
  'sound-a-like',
  'soundalike',
  'tribute band',
  'tribute to',
  'hello i\'m',
  'hello im',
  'the tribute',
  'impersonator',
  'backing tracks',
  'cover band',
  'piano man',
];

export function isAuthenticSaavnSong(s: any, query?: string): boolean {
  if (!s) return false;
  const qLower = (query || '').toLowerCase();
  const title = (s.song || s.title || '').toLowerCase();
  const artist = (s.primary_artists || s.more_info?.primary_artists || s.singers || '').toLowerCase();
  const album = (s.album || s.more_info?.album || '').toLowerCase();
  const label = (s.label || s.copyright_text || s.more_info?.label || '').toLowerCase();

  // If user explicitly searched for tribute, karaoke, or remix, allow it
  const userWantsSpecial =
    qLower.includes('karaoke') ||
    qLower.includes('tribute') ||
    qLower.includes('cover') ||
    qLower.includes('remix') ||
    qLower.includes('instrumental');

  if (!userWantsSpecial) {
    for (const fa of FAKE_ARTISTS) {
      if (artist.includes(fa)) return false;
    }
    const combined = `${title} ${artist} ${album} ${label}`;
    if (FAKE_NOISE_REGEX.test(combined)) return false;

    // Filter soundalike remake labels pretending to be original artists
    if (/\b(maxence|ns recording|nmw rec|tribute|soundalike|cover pop|threesound)\b/i.test(label)) {
      return false;
    }

    // Discard remixes or altered versions if user didn't ask for them
    if (/\b(remix|instrumental|restrung)\b/i.test(title)) return false;
  }

  return true;
}

export function mapSaavnSongToTrack(s: any): Track | null {
  if (!s) return null;
  const streamUrl = decryptSaavnMediaUrl(s.encrypted_media_url);
  if (!streamUrl) return null;

  const artwork = (s.image || '')
    .replace('50x50', '500x500')
    .replace('150x150', '500x500');

  const title = decodeHtmlEntities(s.song || s.title || 'Untitled Track');
  const artist = decodeHtmlEntities(
    s.primary_artists || s.more_info?.primary_artists || s.singers || 'Various Artists'
  );
  const album = decodeHtmlEntities(s.album || s.more_info?.album || 'Single');
  const duration = parseInt(s.duration, 10) || 210;
  const lang = (s.language || '').toLowerCase();
  const genre =
    lang === 'malayalam'
      ? 'Malayalam'
      : lang === 'hindi'
      ? 'Bollywood'
      : lang === 'tamil'
      ? 'Tamil'
      : lang === 'telugu'
      ? 'Telugu'
      : lang === 'english'
      ? 'Pop'
      : 'Music';

  return {
    id: `saavn-${s.id}`,
    providerId: 'saavn',
    providerName: 'Tavilo Master Hi-Fi',
    title,
    artist,
    artists: artist.split(',').map((a: string) => a.trim()).filter(Boolean),
    album,
    artwork:
      artwork ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    duration,
    streamUrl,
    genre,
    genres: [genre, 'Hi-Fi Master'],
    moods: ['Studio Master', 'Clear Audio'],
    playbackCapability: 'playable',
    playbackSource: '320kbps High Fidelity MP4',
    licenseName: decodeHtmlEntities(s.copyright_text || s.label || 'Studio Master License'),
    licenseUrl: 'https://www.jiosaavn.com/terms',
    releasedDate: s.year ? `${s.year}-01-01` : undefined,
  };
}

const SAAVN_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'X-Forwarded-For': '103.38.12.245',
  'CF-IPCountry': 'IN',
};

export function scoreSaavnCandidate(item: any, qStr: string): number {
  const q = qStr.toLowerCase().trim();
  const qWords = q.split(/[\s,]+/).filter((w) => w.length > 1);
  const title = (item.song || item.title || '').toLowerCase().trim();
  const cleanTitle = title.replace(/\s*[\(\[\{].*?[\)\]\}]\s*/g, '').trim();
  const artist = (item.primary_artists || item.singers || item.more_info?.primary_artists || '').toLowerCase().trim();
  const plays = parseInt(item.play_count || 0, 10);

  let score = 0;

  // Exact or prefix title match
  if (cleanTitle === q) {
    score += 2500;
  } else if (cleanTitle.startsWith(q) || q.startsWith(cleanTitle)) {
    score += 1200;
  } else if (cleanTitle.includes(q)) {
    score += 600;
  }

  // Word matches in title & artist
  for (const w of qWords) {
    if (cleanTitle.includes(w)) score += 350;
    if (artist.includes(w)) score += 450;
  }

  // Clean title boost (penalize remixes/covers if not requested by user)
  const isClean = !title.includes('(') && !title.includes('[');
  if (isClean) {
    score += 300;
  } else {
    if (/\b(remix|acoustic|live|slowed|restrung|version|instrumental)\b/i.test(title)) {
      score -= 500;
    }
  }

  // Authentic megahit / play count tiers (original studio masters have millions of plays)
  if (plays >= 50000000) score += 5000;
  else if (plays >= 10000000) score += 3000;
  else if (plays >= 1000000) score += 1500;
  else if (plays >= 100000) score += 500;
  else if (plays < 50000) score -= 600; // Impostors/covers typically < 50k

  score += Math.log10(Math.max(plays, 1)) * 50;

  return score;
}

export async function searchSaavnTracks(query: string, limit: number = 20): Promise<Track[]> {
  try {
    const fetchLimit = Math.max(limit * 2, 40);
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&p=1&n=${fetchLimit}&q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: SAAVN_FETCH_HEADERS,
      cache: 'no-store',
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawResults: any[] = data?.results || [];

    // Filter authentic tracks
    const authenticItems = rawResults.filter((item: any) => isAuthenticSaavnSong(item, query));

    // Smart relevance and play-count scoring:
    // Highest priority to genuine original masters with millions of plays matching title and artist
    authenticItems.sort((a: any, b: any) => scoreSaavnCandidate(b, query) - scoreSaavnCandidate(a, query));

    const tracks: Track[] = [];
    const seenTracks = new Set<string>();

    for (const item of authenticItems) {
      const track = mapSaavnSongToTrack(item);
      if (!track) continue;

      const normTitle = track.title
        .toLowerCase()
        .replace(/\s*[\(\[\{].*?[\)\]\}]\s*/g, '')
        .replace(/[^a-z0-9]/g, '');
      const normArtist = track.artist
        .toLowerCase()
        .replace(/\s*[\(\[\{].*?[\)\]\}]\s*/g, '')
        .replace(/[^a-z0-9]/g, '');
      const dedupKey = `${normTitle}-${normArtist}`;

      if (!seenTracks.has(dedupKey) && !tracks.some((t) => t.id === track.id)) {
        seenTracks.add(dedupKey);
        tracks.push(track);
      }
      if (tracks.length >= limit) break;
    }

    return tracks;
  } catch (err) {
    console.warn('Saavn search error:', err);
    return [];
  }
}

// Curated Top Chart Playlists for instant high-quality streaming
const CHART_PLAYLIST_IDS: Record<string, string[]> = {
  malayalam: ['1134705865', '592722547'], // Malayalam: India Superhits Top 50, Malayalam Viral Hits
  english: ['1081991857', '303128179'], // English Hit Songs, Best Of Pop - English
  viral: ['1134548194', '48189087'], // India Superhits Top 50, English Viral Hits
  all: ['1134705865', '1081991857', '1134548194'],
};

export async function getSaavnTrending(
  category: 'malayalam' | 'english' | 'viral' | 'all' = 'all',
  limit: number = 12
): Promise<Track[]> {
  try {
    const playlistIds = CHART_PLAYLIST_IDS[category] || CHART_PLAYLIST_IDS.all;
    const tracks: Track[] = [];

    for (const listid of playlistIds) {
      const url = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&_marker=0&cc=in&listid=${listid}`;
      const res = await fetch(url, {
        headers: SAAVN_FETCH_HEADERS,
        next: { revalidate: 14400 }, // Cache chart for 4 hours
      });

      if (!res.ok) continue;

      const data = await res.json();
      const songs = data?.songs || [];

      for (const song of songs) {
        if (!isAuthenticSaavnSong(song)) continue;
        const track = mapSaavnSongToTrack(song);
        if (track && !tracks.some((t) => t.id === track.id)) {
          tracks.push(track);
        }
        if (tracks.length >= limit) break;
      }

      if (tracks.length >= limit) break;
    }

    if (tracks.length > 0) return tracks.slice(0, limit);
  } catch (err) {
    console.warn('Error fetching Saavn trending charts:', err);
  }

  // Fallback to search query
  const queryMap: Record<string, string> = {
    malayalam: 'Trending Malayalam Hits',
    english: 'Global Pop Hits',
    viral: 'Top Viral Hits',
    all: 'Superhits Top 50',
  };

  return searchSaavnTracks(queryMap[category] || 'Superhits Top 50', limit);
}
