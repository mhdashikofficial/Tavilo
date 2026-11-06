import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

function decryptMediaUrl(encryptedMediaUrl: string): string {
  const decrypted = CryptoJS.DES.decrypt(
    {
      ciphertext: CryptoJS.enc.Base64.parse(encryptedMediaUrl),
    } as any,
    DES_KEY,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  return decrypted.toString(CryptoJS.enc.Utf8);
}

const NOISE_TAGS = /[\(\[\{](?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|lyrics?|hd|4k|audio|remastered|full\s*song|video\s*song|lyrical\s*video|music\s*video)[\)\]\}]/gi;
const STANDALONE_NOISE = /\b(official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|video\s*song|lyric\s*video|lyrical\s*video|audio\s*song|full\s*song|visualizer|remastered|4k|hd|lyrics?)\b/gi;
const LABEL_NOISE = /\b(sony\s*music|saregama|think\s*music|t-series|zee\s*music|speed\s*records|aditya\s*music|divo\s*music|bhavana\s*studios|motion\s*pictures|films|records)\b/gi;

function cleanSearchQuery(raw: string): string {
  return raw
    .replace(NOISE_TAGS, ' ')
    .replace(STANDALONE_NOISE, ' ')
    .replace(LABEL_NOISE, ' ')
    .replace(/[\-\|•:_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FAKE_NOISE_REGEX = /\b(tribute|karaoke|originally performed by|made famous by|in the style of|instrumental version|cover version|backing track|unofficial remix|sound-?a-?like)\b/i;
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
];

function isAuthenticMatch(
  requestedTitle: string,
  requestedArtist: string,
  candidateTitle: string,
  candidateArtist: string,
  candidateAlbum?: string
): boolean {
  const titleLower = (candidateTitle || '').toLowerCase();
  const artistLower = (candidateArtist || '').toLowerCase();
  const albumLower = (candidateAlbum || '').toLowerCase();
  const reqTitleLower = (requestedTitle || '').toLowerCase();
  const reqArtistLower = (requestedArtist || '').toLowerCase();

  // If user didn't ask for a remix/karaoke/tribute, reject candidates containing those
  const userWantsSpecial =
    reqTitleLower.includes('remix') ||
    reqTitleLower.includes('karaoke') ||
    reqTitleLower.includes('tribute') ||
    reqTitleLower.includes('cover') ||
    reqTitleLower.includes('instrumental');

  if (!userWantsSpecial) {
    for (const fa of FAKE_ARTISTS) {
      if (artistLower.includes(fa)) return false;
    }
    const combined = `${titleLower} ${artistLower} ${albumLower}`;
    if (FAKE_NOISE_REGEX.test(combined)) return false;
  }

  // Ensure significant title words match
  const titleWords = reqTitleLower
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !['the', 'and', 'song', 'audio', 'video', 'official', 'lyrics'].includes(w));
  if (titleWords.length > 0 && !titleWords.some(w => titleLower.includes(w))) {
    return false;
  }

  // If requested artist is specified, ensure candidate artist actually matches!
  if (reqArtistLower && reqArtistLower !== 'youtube artist' && reqArtistLower.length > 2) {
    const artistWords = reqArtistLower
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 3 && !['the', 'and', 'music', 'official', 'vevo', 'topic', 'records'].includes(w));
    if (artistWords.length > 0 && !artistWords.some(w => artistLower.includes(w))) {
      return false;
    }
  }

  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';
  const query = searchParams.get('query') || `${title} ${artist}`.trim();

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query required' }, { status: 400 });
  }

  const cleanQuery = cleanSearchQuery(query);
  const cleanTitle = cleanSearchQuery(title);
  const cleanArtist = cleanSearchQuery(artist);

  try {
    const searchQueries = [cleanQuery];
    if (cleanTitle && cleanTitle !== cleanQuery && cleanTitle.length > 2) {
      searchQueries.push(cleanTitle);
    }

    let matchingSong: any = null;

    for (const q of searchQueries) {
      const searchUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(q)}`;
      const searchRes = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        next: { revalidate: 86400 },
      });

      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const songs = searchData?.songs?.data;

      if (Array.isArray(songs) && songs.length > 0) {
        // Strictly validate authentic studio master match (prevent playing fake tribute / karaoke / unofficial remixes)
        const candidate = songs.find((s: any) =>
          isAuthenticMatch(
            cleanTitle || title,
            cleanArtist || artist,
            s.title,
            s.more_info?.primary_artists || s.singers || '',
            s.album
          )
        );
        if (candidate) {
          matchingSong = candidate;
          break;
        }
      }
    }

    if (!matchingSong) {
      return NextResponse.json(
        { success: false, error: 'No authentic studio master found in Saavn catalog' },
        { status: 404 }
      );
    }

    const pid = matchingSong.id;
    const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${pid}`;
    const detailsRes = await fetch(detailsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 86400 },
    });

    if (!detailsRes.ok) {
      return NextResponse.json({ success: false, error: 'Details lookup failed' }, { status: 502 });
    }

    const detailsData = await detailsRes.json();
    const songDetails = detailsData[pid];

    if (!songDetails || !songDetails.encrypted_media_url) {
      return NextResponse.json({ success: false, error: 'No encrypted media URL' }, { status: 404 });
    }

    const rawDecrypted = decryptMediaUrl(songDetails.encrypted_media_url);
    if (!rawDecrypted || !rawDecrypted.includes('.mp4')) {
      return NextResponse.json({ success: false, error: 'Decryption failed' }, { status: 500 });
    }

    // Prefer high quality 320kbps mp4, replace http with secure https
    const highQualityStreamUrl = rawDecrypted
      .replace(/^http:\/\//i, 'https://')
      .replace(/_(?:96|160|48|12)\.mp4/i, '_320.mp4');

    const artwork = (songDetails.image || matchingSong.image || '')
      .replace('50x50', '500x500')
      .replace('150x150', '500x500');

    return NextResponse.json(
      {
        success: true,
        streamUrl: highQualityStreamUrl,
        title: songDetails.song || matchingSong.title,
        artist: songDetails.primary_artists || matchingSong.more_info?.primary_artists || artist,
        album: songDetails.album || matchingSong.album,
        duration: parseInt(songDetails.duration, 10) || 210,
        artwork,
        quality: '320kbps',
        format: 'audio/mp4',
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (err: any) {
    console.warn('Audio resolver API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
