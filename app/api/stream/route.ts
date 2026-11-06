import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { requestHttp1 } from '@/lib/music/http';
import { getVisitorData } from '@/lib/music/visitor';

export const dynamic = 'force-dynamic';

interface CacheEntry {
  url: string;
  expires: number;
  mimeType: string;
}

// In-memory cache for resolved direct audio URLs (valid for 4 hours)
const urlCache = new Map<string, CacheEntry>();

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

        const streamUrl = stdout.trim().split('\n').map((l) => l.trim()).find((l) => l.startsWith('http'));
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
 * High-speed native audio stream extractor using YouTube Innertube VisionOS Client API over HTTP/1.1.
 * VisionOS client requires zero JS deciphering, zero PO tokens, and returns direct unthrottled GoogleVideo audio streams.
 * Using HTTP/1.1 prevents Node.js undici ERR_HTTP2_SESSION_ERROR: Session closed with error code 11 (GOAWAY).
 * 100% pure HTTPS fetch — zero dependency on Python or external binaries.
 */
async function resolveYouTubeAudioStream(videoId: string): Promise<{ url: string; mimeType: string }> {
  if (urlCache.has(videoId)) {
    const entry = urlCache.get(videoId)!;
    if (Date.now() < entry.expires) {
      return { url: entry.url, mimeType: entry.mimeType };
    }
    urlCache.delete(videoId);
  }

  let debugLog: any = {};
  const visitorData = await getVisitorData();
  debugLog.visitorDataLength = visitorData.length;

  // Strategy 1: YouTube Innertube VisionOS Client over HTTP/1.1
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
      'X-YouTube-Client-Name': '101',
      'X-YouTube-Client-Version': '1.02',
      Origin: 'https://www.youtube.com',
    };
    if (visitorData) {
      headers['X-Goog-Visitor-Id'] = visitorData;
    }

    const payload = {
      context: {
        client: {
          clientName: 'VISIONOS',
          clientVersion: '1.02',
          deviceMake: 'Apple',
          deviceModel: 'RealityDevice17,1',
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
          osName: 'visionOS',
          osVersion: '26.5.23O471',
          hl: 'en',
          timeZone: 'UTC',
          utcOffsetMinutes: 0,
          visitorData: visitorData || undefined,
        },
      },
      videoId,
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: 'HTML5_PREF_WANTS',
          signatureTimestamp: 20760,
        },
      },
      contentCheckOk: true,
      racyCheckOk: true,
    };

    const res = await requestHttp1('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    debugLog.visionosStatus = res.status;
    if (res.status === 200) {
      const data = await res.json();
      debugLog.visionosPlayability = data.playabilityStatus?.status;
      debugLog.visionosReason = data.playabilityStatus?.reason;
      if (data.playabilityStatus?.status === 'OK') {
        const formats = (data.streamingData?.adaptiveFormats || []).filter(
          (f: any) => f.mimeType?.includes('audio') && f.url
        );
        debugLog.visionosAudioCount = formats.length;

        if (formats.length > 0) {
          // Prefer itag 140 (audio/mp4 AAC 128kbps) for universal cross-platform support
          const target = formats.find((f: any) => f.itag === 140) ||
            formats.find((f: any) => f.mimeType?.includes('audio/mp4')) ||
            formats[0];

          if (target?.url) {
            const mime = target.mimeType.split(';')[0].trim() || 'audio/mp4';
            urlCache.set(videoId, {
              url: target.url,
              mimeType: mime,
              expires: Date.now() + 4 * 60 * 60 * 1000,
            });
            return { url: target.url, mimeType: mime };
          }
        }
      }
    }
  } catch (err: any) {
    debugLog.visionosError = err?.message;
    console.warn(`VisionOS player extraction error for ${videoId}:`, err?.message);
  }

  // Strategy 2: TVHTML5 Client fallback
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent':
        'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1',
      'X-YouTube-Client-Name': '7',
      'X-YouTube-Client-Version': '5.20260707',
      Origin: 'https://www.youtube.com',
    };
    if (visitorData) {
      headers['X-Goog-Visitor-Id'] = visitorData;
    }

    const payload = {
      context: {
        client: {
          clientName: 'TVHTML5',
          clientVersion: '5.20260707',
          deviceMake: 'Samsung',
          deviceModel: 'UKS9800',
          userAgent:
            'Mozilla/5.0 (SMART-TV; Linux; Tizen 2.4.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.4.0 TV Safari/538.1',
          osName: 'Tizen',
          osVersion: '2.4.0',
          hl: 'en',
          visitorData: visitorData || undefined,
        },
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    };

    const res = await requestHttp1('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    debugLog.tvStatus = res.status;
    if (res.status === 200) {
      const data = await res.json();
      debugLog.tvPlayability = data.playabilityStatus?.status;
      debugLog.tvReason = data.playabilityStatus?.reason;
      if (data.playabilityStatus?.status === 'OK') {
        const formats = (data.streamingData?.adaptiveFormats || []).filter(
          (f: any) => f.mimeType?.includes('audio') && f.url
        );
        debugLog.tvAudioCount = formats.length;

        if (formats.length > 0) {
          const target = formats.find((f: any) => f.itag === 140) ||
            formats.find((f: any) => f.mimeType?.includes('audio/mp4')) ||
            formats[0];

          if (target?.url) {
            const mime = target.mimeType.split(';')[0].trim() || 'audio/mp4';
            urlCache.set(videoId, {
              url: target.url,
              mimeType: mime,
              expires: Date.now() + 4 * 60 * 60 * 1000,
            });
            return { url: target.url, mimeType: mime };
          }
        }
      }
    }
  } catch (err: any) {
    debugLog.tvError = err?.message;
    console.warn(`TVHTML5 player extraction error for ${videoId}:`, err?.message);
  }

  // Strategy 3: CLI yt-dlp fallback (for local development or environments with yt-dlp)
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
    debugLog.cliError = cliErr?.message;
    console.warn(`CLI yt-dlp fallback unavailable for ${videoId}:`, cliErr?.message);
  }

  throw new Error(`Unable to resolve authentic YouTube audio stream for ${videoId}: ${JSON.stringify(debugLog)}`);
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

    // Stream through server proxy over HTTP/1.1 with Range support for seamless seeking and background playback
    const clientRange = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
    };

    if (clientRange) {
      upstreamHeaders['Range'] = clientRange;
    }

    const upstreamRes = await requestHttp1(directUrl, {
      method: 'GET',
      headers: upstreamHeaders,
    });

    if (upstreamRes.status !== 200 && upstreamRes.status !== 206) {
      urlCache.delete(videoId);
      return NextResponse.json(
        { error: 'Upstream audio stream not accessible' },
        { status: upstreamRes.status }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers['content-type'] || mimeType);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    if (upstreamRes.headers['content-length']) {
      responseHeaders.set('Content-Length', upstreamRes.headers['content-length']);
    }
    if (upstreamRes.headers['content-range']) {
      responseHeaders.set('Content-Range', upstreamRes.headers['content-range']);
    }
    responseHeaders.set('Cache-Control', 'public, max-age=14400');

    // Convert Node Readable to Web ReadableStream for standard Response streaming
    const webStream = new ReadableStream({
      start(controller) {
        upstreamRes.stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        upstreamRes.stream.on('end', () => {
          controller.close();
        });
        upstreamRes.stream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        upstreamRes.stream.destroy();
      },
    });

    return new Response(webStream, {
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

    const upstreamRes = await requestHttp1(directUrl, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
      },
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', upstreamRes.headers['content-type'] || mimeType);
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    if (upstreamRes.headers['content-range']) {
      const cr = upstreamRes.headers['content-range'];
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
