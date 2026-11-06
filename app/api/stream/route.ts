import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  url: string;
  expires: number;
}

// In-memory cache for resolved direct audio URLs (valid for 4 hours)
const urlCache = new Map<string, CacheEntry>();

function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
  // Check memory cache
  if (urlCache.has(videoId)) {
    const entry = urlCache.get(videoId)!;
    if (Date.now() < entry.expires) {
      return Promise.resolve(entry.url);
    }
    urlCache.delete(videoId);
  }

  return new Promise((resolve, reject) => {
    // Prefer format 140 (128kbps AAC in m4a container), fallback to best audio
    const args = [
      '-g',
      '-f',
      '140/ba[ext=m4a]/ba',
      '--no-warnings',
      '--no-playlist',
      `https://www.youtube.com/watch?v=${videoId}`,
    ];

    execFile('yt-dlp', args, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        console.warn('yt-dlp resolution error for', videoId, ':', error.message);
        return reject(error);
      }

      const streamUrl = stdout.trim().split('\n')[0]?.trim();
      if (!streamUrl || !streamUrl.startsWith('http')) {
        return reject(new Error('No valid stream URL extracted from yt-dlp'));
      }

      // Cache for 4 hours (GoogleVideo URLs are typically valid for 6 hours)
      urlCache.set(videoId, {
        url: streamUrl,
        expires: Date.now() + 4 * 60 * 60 * 1000,
      });

      resolve(streamUrl);
    });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawId = searchParams.get('id') || '';
  const videoId = rawId.replace(/^yt-/, '').trim();

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: 'Valid YouTube video ID required' }, { status: 400 });
  }

  try {
    const directUrl = await resolveYouTubeAudioUrl(videoId);

    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      // If upstream failed (e.g. expired cache), purge cache and retry once
      urlCache.delete(videoId);
      console.warn('Upstream stream fetch status:', upstreamRes.status);
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

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return new Response(null, { status: 400 });
  }

  try {
    const directUrl = await resolveYouTubeAudioUrl(videoId);
    const upstreamRes = await fetch(directUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Range: 'bytes=0-1',
      },
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
