import https from 'https';
import http from 'http';
import { Readable } from 'stream';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 15000,
});

const httpAgent = new http.Agent({
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
 * Enforces HTTP/1.1 for YouTube and media requests to prevent Node.js undici
 * ERR_HTTP2_SESSION_ERROR: Session closed with error code 11 (GOAWAY ENHANCE_YOUR_CALM).
 * Automatically handles HTTP 301/302/307/308 redirects with Range and headers preserved.
 */
export function requestHttp1(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    timeout?: number;
    redirectsRemaining?: number;
  } = {}
): Promise<HttpResponse> {
  const maxRedirects = options.redirectsRemaining !== undefined ? options.redirectsRemaining : 5;

  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const headers: Record<string, string | number> = {
        Accept: '*/*',
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
          agent: isHttps ? httpsAgent : httpAgent,
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

          // Handle automatic redirect following (301, 302, 303, 307, 308)
          if (
            (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) &&
            flatHeaders['location'] &&
            maxRedirects > 0
          ) {
            // Drain stream before redirecting
            res.resume();
            const redirectUrl = new URL(flatHeaders['location'], parsedUrl).toString();
            return resolve(
              requestHttp1(redirectUrl, {
                ...options,
                method: status === 303 ? 'GET' : options.method || 'GET',
                redirectsRemaining: maxRedirects - 1,
              })
            );
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
