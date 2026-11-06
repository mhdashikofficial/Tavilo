import https from 'https';
import http from 'http';
import { Readable } from 'stream';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 15000,
});

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  text: () => Promise<string>;
  json: <T = any>() => Promise<T>;
  stream: Readable;
}

/**
 * Enforces HTTP/1.1 for YouTube requests to prevent Node.js undici
 * ERR_HTTP2_SESSION_ERROR: Session closed with error code 11 (GOAWAY ENHANCE_YOUR_CALM).
 */
export function requestHttp1(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    timeout?: number;
  } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const headers: Record<string, string | number> = {
        'Accept': '*/*',
        ...(options.headers || {}),
      };

      if (options.body) {
        headers['Content-Length'] = Buffer.byteLength(options.body);
      }

      const req = transport.request(
        parsedUrl,
        {
          method: options.method || 'GET',
          headers,
          agent: isHttps ? httpsAgent : undefined,
          timeout: options.timeout || 15000,
        },
        (res) => {
          const status = res.statusCode || 200;
          const flatHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) {
              flatHeaders[k.toLowerCase()] = v.join(', ');
            } else if (v !== undefined) {
              flatHeaders[k.toLowerCase()] = v;
            }
          }

          let bodyReadPromise: Promise<string> | null = null;

          const readBody = (): Promise<string> => {
            if (!bodyReadPromise) {
              bodyReadPromise = new Promise((resResolve, resReject) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
                res.on('end', () => resResolve(Buffer.concat(chunks).toString('utf-8')));
                res.on('error', resReject);
              });
            }
            return bodyReadPromise;
          };

          resolve({
            status,
            headers: flatHeaders,
            text: readBody,
            json: async <T = any>() => {
              const raw = await readBody();
              return JSON.parse(raw) as T;
            },
            stream: res,
          });
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`HTTP/1.1 request timed out after ${options.timeout || 15000}ms`));
      });

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}
