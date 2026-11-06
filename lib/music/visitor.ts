import { requestHttp1 } from '@/lib/music/http';

let cachedVisitorData: { value: string; expires: number } | null = null;

export async function getVisitorData(): Promise<string> {
  if (cachedVisitorData && Date.now() < cachedVisitorData.expires && cachedVisitorData.value.length >= 100) {
    return cachedVisitorData.value;
  }

  // Method 1: sw.js_data endpoint (returns full ~444 char session/botguard visitor token)
  try {
    const swRes = await requestHttp1('https://www.youtube.com/sw.js_data', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (swRes.status === 200) {
      const text = await swRes.text();
      const match = text.match(/Cgt[a-zA-Z0-9_\-%]{100,}/);
      if (match && match[0]) {
        cachedVisitorData = {
          value: match[0],
          expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
        };
        return match[0];
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch visitorData via sw.js_data:', err?.message);
  }

  // Method 2: Fetch watch page for full visitorData if sw.js_data failed
  try {
    const watchRes = await requestHttp1('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (watchRes.status === 200) {
      const html = await watchRes.text();
      const match = html.match(/"VISITOR_DATA"\s*:\s*"(Cgt[a-zA-Z0-9_\-%]{100,})"/);
      if (match && match[1]) {
        cachedVisitorData = {
          value: match[1],
          expires: Date.now() + 12 * 60 * 60 * 1000,
        };
        return match[1];
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch visitorData via watch page:', err?.message);
  }

  return '';
}

export function setVisitorData(vd: string) {
  // Only accept full-length botguard session tokens (never accept 48-char basic tokens)
  if (typeof vd === 'string' && vd.startsWith('Cgt') && vd.length >= 100) {
    cachedVisitorData = {
      value: vd,
      expires: Date.now() + 12 * 60 * 60 * 1000,
    };
  }
}
