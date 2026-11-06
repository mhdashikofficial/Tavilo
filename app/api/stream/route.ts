import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import CryptoJS from 'crypto-js';

export const dynamic = 'force-dynamic';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

interface CacheEntry {
  url: string;
  expires: number;
}

// In-memory cache for resolved direct audio URLs (valid for 4 hours)
const urlCache = new Map<string, CacheEntry>();

function decryptSaavnMediaUrl(encryptedMediaUrl: string): string {
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

async function resolveStudioAudio(title?: string, artist?: string): Promise<string | null> {
  const q = `${title || ''} ${artist || ''}`.trim();
  if (!q) return null;

  try {
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&p=1&n=8&q=${encodeURIComponent(q)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const results: any[] = data?.results || [];

    const NOISE_REGEX = /\b(sped\s*up|slowed|nightcore|reverb|remix|lofi|lo-fi|tribute|karaoke|cover|instrumental)\b/i;
    const cleanResults = results.filter((r: any) => !NOISE_REGEX.test(r.song || '') && !NOISE_REGEX.test(r.album || ''));
    cleanResults.sort((a: any, b: any) => (parseInt(b.play_count || 0, 10) - parseInt(a.play_count || 0, 10)));

    const best = cleanResults[0] || results[0];
    if (best?.encrypted_media_url) {
      const url = decryptSaavnMediaUrl(best.encrypted_media_url);
      if (url) return url;
    }
  } catch (err) {
    console.warn('resolveStudioAudio fallback error:', err);
  }
  return null;
}

function getExecutableCandidates(): string[] {
  const isWindows = process.platform === 'win32';
  return isWindows
    ? ['yt-dlp', 'C:\\Python313\\Scripts\\yt-dlp.exe', 'yt-dlp.exe']
    : ['yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
}

function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
  if (urlCache.has(videoId)) {
    const entry = urlCache.get(videoId)!;
    if (Date.now() < entry.expires) {
      return Promise.resolve(entry.url);
    }
    urlCache.delete(videoId);
  }

  const executables = getExecutableCandidates();
  const args = [
    '-g',
    '-f',
    '140/ba[ext=m4a]/ba',
    '--no-warnings',
    '--no-playlist',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  const tryExec = (index: number): Promise<string> => {
    if (index >= executables.length) {
      return Promise.reject(new Error('yt-dlp executable not found or failed on all candidate paths'));
    }

    const exe = executables[index];
    return new Promise((resolve, reject) => {
      execFile(exe, args, { timeout: 15000 }, (error, stdout) => {
        if (error) {
          return tryExec(index + 1).then(resolve).catch(reject);
        }

        const streamUrl = stdout.trim().split('\n').map(l => l.trim()).find(l => l.startsWith('http'));
        if (!streamUrl) {
          return tryExec(index + 1).then(resolve).catch(reject);
        }

        urlCache.set(videoId, {
          url: streamUrl,
          expires: Date.now() + 4 * 60 * 60 * 1000,
        });

        resolve(streamUrl);
      });
    });
  };

  return tryExec(0);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('id') || '';
  const videoId = rawId.replace(/^yt-/, '').trim();
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: 'Valid YouTube video ID required' }, { status: 400 });
  }

  try {
    let directUrl: string | null = null;

    // Strategy 1: Attempt native yt-dlp audio stream extraction
    try {
      directUrl = await resolveYouTubeAudioUrl(videoId);
    } catch (ytErr: any) {
      console.warn(`yt-dlp stream extraction unavailable for ${videoId}:`, ytErr?.message);
    }

    // Strategy 2: If yt-dlp failed (e.g. cloud host, missing binary), fallback to authentic studio recording
    if (!directUrl && (title || artist)) {
      directUrl = await resolveStudioAudio(title, artist);
    }

    if (!directUrl) {
      return NextResponse.json(
        { error: 'Audio stream converter could not resolve media for this track' },
        { status: 502 }
      );
    }

    // If stream URL is from Saavn global CDN, redirect with 302 for 0ms proxy latency and direct CDN byte streaming
    if (directUrl.includes('saavncdn.com')) {
      const res = NextResponse.redirect(directUrl, { status: 302 });
      res.headers.set('Access-Control-Allow-Origin', '*');
      res.headers.set('Cache-Control', 'public, max-age=86400');
      return res;
    }

    // Otherwise (GoogleVideo), stream through server proxy with Range support to avoid IP/CORS blocks
    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {};

    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      urlCache.delete(videoId);
      // Attempt studio fallback if upstream failed with 403
      if (title || artist) {
        const studioUrl = await resolveStudioAudio(title, artist);
        if (studioUrl) {
          const res = NextResponse.redirect(studioUrl, { status: 302 });
          res.headers.set('Access-Control-Allow-Origin', '*');
          return res;
        }
      }
      return NextResponse.json(
        { error: 'Upstream audio stream not accessible' },
        { status: upstreamRes.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    if (upstreamRes.headers.has('content-length')) {
      responseHeaders.set('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.has('content-range')) {
      responseHeaders.set('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    responseHeaders.set('Cache-Control', 'public, max-age=14400');

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('Audio stream handler error for video', videoId, ':', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to stream audio' },
      { status: 500 }
    );
  }
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('id') || '';
  const videoId = rawId.replace(/^yt-/, '').trim();
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return new Response(null, { status: 400 });
  }

  try {
    let directUrl: string | null = null;
    try {
      directUrl = await resolveYouTubeAudioUrl(videoId);
    } catch {
      if (title || artist) {
        directUrl = await resolveStudioAudio(title, artist);
      }
    }

    if (!directUrl) return new Response(null, { status: 404 });

    if (directUrl.includes('saavncdn.com')) {
      const res = NextResponse.redirect(directUrl, { status: 302 });
      res.headers.set('Access-Control-Allow-Origin', '*');
      return res;
    }

    const upstreamRes = await fetch(directUrl, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mp4');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    if (upstreamRes.headers.has('content-range')) {
      const cr = upstreamRes.headers.get('content-range')!;
      const total = cr.split('/')[1];
      if (total && total !== '*') {
        responseHeaders.set('Content-Length', total);
      }
    }

    return new Response(null, {
      status: 200,
      headers: responseHeaders,
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
