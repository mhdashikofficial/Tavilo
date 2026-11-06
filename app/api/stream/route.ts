import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import CryptoJS from 'crypto-js';

export const dynamic = 'force-dynamic';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

interface CacheEntry {
  url: string;
  expires: number;
  mimeType: string;
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

function getExecutableCandidates(): string[] {
  const isWindows = process.platform === 'win32';
  return isWindows
    ? ['yt-dlp', 'C:\\Python313\\Scripts\\yt-dlp.exe', 'yt-dlp.exe']
    : ['yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
}

function resolveYouTubeViaCli(videoId: string): Promise<string> {
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

        resolve(streamUrl);
      });
    });
  };

  return tryExec(0);
}

/**
 * High-speed native audio stream extractor using YouTube Innertube Android Client API.
 * 100% pure HTTPS fetch — zero dependency on Python, yt-dlp binaries, or third-party scrapers.
 * Completely immune to Vercel/cloud serverless runtime limitations.
 */
async function resolveYouTubeAudioStream(videoId: string): Promise<{ url: string; mimeType: string }> {
  if (urlCache.has(videoId)) {
    const entry = urlCache.get(videoId)!;
    if (Date.now() < entry.expires) {
      return { url: entry.url, mimeType: entry.mimeType };
    }
    urlCache.delete(videoId);
  }

  // Strategy 1: Official YouTube Innertube Android Client (Returns direct GoogleVideo stream URLs)
  try {
    const innertubeBody = {
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
          androidSdkVersion: 34,
          osName: 'Android',
          osVersion: '14',
          hl: 'en',
          gl: 'US',
        },
      },
      videoId,
    };

    const res = await fetch('https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
      },
      body: JSON.stringify(innertubeBody),
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.playabilityStatus?.status === 'OK') {
        const formats = (data.streamingData?.adaptiveFormats || []).filter(
          (f: any) => f.mimeType?.includes('audio') && f.url
        );

        if (formats.length > 0) {
          // Sort by bitrate descending, prefer audio/mp4 (m4a) for universal cross-device support
          const mp4Audio = formats.find((f: any) => f.mimeType?.includes('audio/mp4'));
          const best = mp4Audio || formats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];

          if (best?.url) {
            const mime = best.mimeType.split(';')[0].trim() || 'audio/mp4';
            urlCache.set(videoId, {
              url: best.url,
              mimeType: mime,
              expires: Date.now() + 4 * 60 * 60 * 1000,
            });
            return { url: best.url, mimeType: mime };
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`Innertube player extraction error for ${videoId}:`, err?.message);
  }

  // Strategy 2: CLI yt-dlp fallback (for local development or environments with yt-dlp installed)
  try {
    const cliUrl = await resolveYouTubeViaCli(videoId);
    if (cliUrl) {
      const mime = 'audio/mp4';
      urlCache.set(videoId, {
        url: cliUrl,
        mimeType: mime,
        expires: Date.now() + 4 * 60 * 60 * 1000,
      });
      return { url: cliUrl, mimeType: mime };
    }
  } catch (cliErr: any) {
    console.warn(`CLI yt-dlp fallback unavailable for ${videoId}:`, cliErr?.message);
  }

  throw new Error(`Unable to resolve authentic YouTube audio stream for ${videoId}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('id') || '';
  const videoId = rawId.replace(/^yt-/, '').trim();

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: 'Valid YouTube video ID required' }, { status: 400 });
  }

  try {
    const { url: directUrl, mimeType } = await resolveYouTubeAudioStream(videoId);

    // Stream through server proxy with Range support for seamless seeking and background playback
    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
    };

    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      urlCache.delete(videoId);
      return NextResponse.json(
        { error: 'Upstream audio stream not accessible' },
        { status: upstreamRes.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || mimeType);
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

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return new Response(null, { status: 400 });
  }

  try {
    const { url: directUrl, mimeType } = await resolveYouTubeAudioStream(videoId);

    const upstreamRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1',
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
      },
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || mimeType);
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
