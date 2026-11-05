import { NextRequest, NextResponse } from 'next/server';
import { Ytdl, chooseFormat } from '@distube/ytdl-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CachedFormat {
  url: string;
  mimeType: string;
  contentLength?: number;
  expiresAt: number;
}

// In-memory cache for resolved GoogleVideo audio URLs
const formatCache = new Map<string, CachedFormat>();

// Global Ytdl instance
const ytdl = new Ytdl();

// 1 MB chunk window: provides ~1-1.5 minutes of audio per request.
// Downloads in ~50-150ms on cloud networks, completely immune to serverless 10s timeouts.
const CHUNK_SIZE = 1024 * 1024; // 1 MB

async function resolveAudioStream(videoId: string): Promise<CachedFormat | null> {
  const now = Date.now();
  const cached = formatCache.get(videoId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  try {
    const info = await ytdl.getInfo(videoId);
    if (!info || !info.formats || info.formats.length === 0) {
      return null;
    }

    // Prefer itag 140 (audio/mp4; codecs="mp4a.40.2" ~128kbps AAC) - universally compatible on all Android & iOS devices
    let selectedFormat = info.formats.find(f => f.itag === 140);

    // Fallback: Best audio-only format (e.g. itag 251 audio/webm opus ~160kbps)
    if (!selectedFormat) {
      selectedFormat = chooseFormat(info.formats, {
        filter: { hasAudio: true, hasVideo: false },
      });
    }

    // Second fallback: any format that has audio
    if (!selectedFormat) {
      selectedFormat = info.formats.find(f => f.hasAudio);
    }

    if (!selectedFormat || !selectedFormat.url) {
      return null;
    }

    const entry: CachedFormat = {
      url: selectedFormat.url,
      mimeType: selectedFormat.mimeType ? selectedFormat.mimeType.split(';')[0] : 'audio/mp4',
      contentLength: selectedFormat.contentLength ? Number(selectedFormat.contentLength) : undefined,
      expiresAt: now + 4 * 60 * 60 * 1000,
    };

    formatCache.set(videoId, entry);
    return entry;
  } catch (err) {
    console.warn(`[Stream API] Failed to resolve format for ${videoId}:`, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('id');

  if (!videoId || typeof videoId !== 'string' || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
    return NextResponse.json({ error: 'Valid YouTube video ID required' }, { status: 400 });
  }

  let streamInfo = await resolveAudioStream(videoId);
  if (!streamInfo) {
    return NextResponse.json({ error: 'Audio stream format unavailable' }, { status: 404 });
  }

  const clientRange = req.headers.get('range');
  let start = 0;
  let end: number | undefined;
  const total = streamInfo.contentLength;

  if (clientRange) {
    const parts = clientRange.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10) || 0;
    if (parts[1]) {
      end = parseInt(parts[1], 10);
    } else {
      end = total ? Math.min(start + CHUNK_SIZE - 1, total - 1) : start + CHUNK_SIZE - 1;
    }
  } else {
    // If no range header, send the first 1MB chunk to let mobile players start immediately
    end = total ? Math.min(CHUNK_SIZE - 1, total - 1) : CHUNK_SIZE - 1;
  }

  const upstreamHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: '*/*',
    'Accept-Encoding': 'identity',
    Range: `bytes=${start}-${end}`,
  };

  let upstreamRes = await fetch(streamInfo.url, {
    headers: upstreamHeaders,
    signal: req.signal,
  });

  // If cached URL was expired or revoked by GoogleVideo (403 or 410), refresh and retry once
  if (upstreamRes.status === 403 || upstreamRes.status === 410) {
    formatCache.delete(videoId);
    streamInfo = await resolveAudioStream(videoId);
    if (!streamInfo) {
      return NextResponse.json({ error: 'Audio stream expired and could not be refreshed' }, { status: 502 });
    }
    upstreamRes = await fetch(streamInfo.url, {
      headers: upstreamHeaders,
      signal: req.signal,
    });
  }

  if (!upstreamRes.ok && upstreamRes.status !== 206) {
    return NextResponse.json(
      { error: `Upstream streaming failed with status ${upstreamRes.status}` },
      { status: upstreamRes.status }
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', streamInfo.mimeType || 'audio/mp4');
  responseHeaders.set('Accept-Ranges', 'bytes');
  responseHeaders.set('Cache-Control', 'public, max-age=14400');

  const contentRange = upstreamRes.headers.get('content-range');
  if (contentRange) {
    responseHeaders.set('Content-Range', contentRange);
  } else if (total) {
    responseHeaders.set('Content-Range', `bytes ${start}-${end}/${total}`);
  }

  const contentLength = upstreamRes.headers.get('content-length');
  if (contentLength) {
    responseHeaders.set('Content-Length', contentLength);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status === 200 && clientRange ? 206 : upstreamRes.status,
    headers: responseHeaders,
  });
}

export async function HEAD(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('id');

  if (!videoId || typeof videoId !== 'string') {
    return new Response(null, { status: 400 });
  }

  const streamInfo = await resolveAudioStream(videoId);
  if (!streamInfo) {
    return new Response(null, { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', streamInfo.mimeType || 'audio/mp4');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=14400');
  if (streamInfo.contentLength) {
    headers.set('Content-Length', streamInfo.contentLength.toString());
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}
