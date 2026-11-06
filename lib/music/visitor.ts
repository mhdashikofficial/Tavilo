import { requestHttp1 } from '@/lib/music/http';

let cachedVisitorData: { value: string; expires: number } | null = null;

export async function getVisitorData(): Promise<string> {
  if (cachedVisitorData && Date.now() < cachedVisitorData.expires) {
    return cachedVisitorData.value;
  }

  // Method 1: sw.js_data endpoint
  try {
    const swRes = await requestHttp1('https://www.youtube.com/sw.js_data', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (swRes.status === 200) {
      const text = await swRes.text();
      const clean = text.includes('\n') ? text.slice(text.indexOf('\n') + 1) : text;
      const json = JSON.parse(clean);
      const vd = json?.[0]?.[2]?.[6] || json?.[0]?.[2]?.[0]?.[0]?.[13];
      if (typeof vd === 'string' && vd.startsWith('Cgt')) {
        cachedVisitorData = {
          value: vd,
          expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
        };
        return vd;
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch visitorData via sw.js_data:', err?.message);
  }

  // Method 2: Innertube search endpoint fallback
  try {
    const searchRes = await requestHttp1('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240105.01.00',
            hl: 'en',
            gl: 'US',
          },
        },
        query: 'music',
      }),
    });

    if (searchRes.status === 200) {
      const data = await searchRes.json();
      const vd = data?.responseContext?.visitorData;
      if (typeof vd === 'string' && vd.startsWith('Cgt')) {
        cachedVisitorData = {
          value: vd,
          expires: Date.now() + 12 * 60 * 60 * 1000,
        };
        return vd;
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch visitorData via search endpoint:', err?.message);
  }

  return '';
}

export function setVisitorData(vd: string) {
  if (typeof vd === 'string' && vd.startsWith('Cgt')) {
    cachedVisitorData = {
      value: vd,
      expires: Date.now() + 12 * 60 * 60 * 1000,
    };
  }
}
