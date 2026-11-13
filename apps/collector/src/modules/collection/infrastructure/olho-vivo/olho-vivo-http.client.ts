import { Logger } from '@nestjs/common';

import { CircuitBreaker } from './circuit-breaker';
import { OlhoVivoAuthError, OlhoVivoRequestError } from './olho-vivo.errors';

const OLHO_VIVO_BASE_URL = 'https://api.olhovivo.sptrans.com.br/v2.1';

export type OlhoVivoResponse = { status: number; body: unknown; text: string; durationMs: number };

type Query = Record<string, string | number>;

type RawResponse = { status: number; text: string; headers: Headers; durationMs: number };

export type OlhoVivoClientOptions = {
  token: string | undefined;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  maxRetryAfterMs?: number;
  breaker?: CircuitBreaker;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  logger?: Pick<Logger, 'log' | 'warn'>;
};

/**
 * Waits for the given number of milliseconds.
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads Retry-After in seconds, ignoring the HTTP-date form, which the API has never sent.
 */
function retryAfterMs(headers: Headers): number | undefined {
  const value = headers.get('retry-after');
  return value && /^\d+$/.test(value.trim()) ? Number(value) * 1000 : undefined;
}

/**
 * Tells whether an error means the API is unreachable or failing, as opposed to a refused token or a bad request.
 */
function isOutage(error: unknown): boolean {
  return error instanceof OlhoVivoRequestError && error.retryable;
}

export class OlhoVivoHttpClient {
  private cookie: string | undefined;
  private pendingLogin: Promise<string> | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly backoffMs: number;
  private readonly maxRetryAfterMs: number;
  private readonly breaker: CircuitBreaker;
  private readonly fetch: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private readonly logger: Pick<Logger, 'log' | 'warn'>;

  /**
   * Receives the token and the limits from the SPTrans report: 10 s timeout, 3 retries waiting 1, 2 and 4 s.
   */
  constructor(private readonly options: OlhoVivoClientOptions) {
    this.baseUrl = options.baseUrl ?? OLHO_VIVO_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.retries = options.retries ?? 3;
    this.backoffMs = options.backoffMs ?? 1_000;
    this.maxRetryAfterMs = options.maxRetryAfterMs ?? 30_000;
    this.breaker = options.breaker ?? new CircuitBreaker({ failureThreshold: 5, openMs: 60_000 });
    this.fetch = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? wait;
    this.now = options.now ?? Date.now;
    this.logger = options.logger ?? new Logger(OlhoVivoHttpClient.name);
  }

  /**
   * Calls a GET endpoint with the session cookie, logging in first or again when needed, and returns the parsed JSON with the raw text.
   */
  async get(path: string, query: Query = {}): Promise<OlhoVivoResponse> {
    return this.breaker.run(
      () => this.withRetries(() => this.getWithSession(path, query)),
      isOutage,
    );
  }

  /**
   * Repeats the call after transient failures, waiting longer each time or as long as Retry-After asks.
   */
  private async withRetries<T>(call: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (error) {
        if (!isOutage(error) || attempt >= this.retries) {
          throw error;
        }
        const requested = (error as OlhoVivoRequestError).retryAfterMs;
        await this.sleep(
          Math.min(requested ?? this.backoffMs * 2 ** attempt, this.maxRetryAfterMs),
        );
      }
    }
  }

  /**
   * Makes the GET with the current session and, when the API answers 401, logs in again and repeats it once.
   */
  private async getWithSession(path: string, query: Query): Promise<OlhoVivoResponse> {
    let response = await this.send('GET', path, query, await this.session());
    if (response.status === 401) {
      this.cookie = undefined;
      response = await this.send('GET', path, query, await this.session());
      if (response.status === 401) {
        throw new OlhoVivoAuthError('session refused right after a new login');
      }
    }
    try {
      const body: unknown = JSON.parse(response.text);
      return {
        status: response.status,
        body,
        text: response.text,
        durationMs: response.durationMs,
      };
    } catch {
      throw new OlhoVivoRequestError(
        'invalid_response',
        `GET ${path} returned a body that is not JSON`,
        false,
        response.status,
      );
    }
  }

  /**
   * Returns the session cookie, sharing a single login between calls that need it at the same time.
   */
  private async session(): Promise<string> {
    if (this.cookie) {
      return this.cookie;
    }
    this.pendingLogin ??= this.login().finally(() => {
      this.pendingLogin = undefined;
    });
    return this.pendingLogin;
  }

  /**
   * Logs in with the token and keeps the session cookie; the API answers 200 with true or false, so the body decides.
   */
  private async login(): Promise<string> {
    if (!this.options.token) {
      throw new OlhoVivoAuthError('SPTRANS_API_TOKEN is not set');
    }
    const response = await this.send('POST', '/Login/Autenticar', { token: this.options.token });
    if (response.text.trim() !== 'true') {
      throw new OlhoVivoAuthError('token refused by the Olho Vivo API');
    }
    const cookie = response.headers
      .getSetCookie()
      .map((header) => header.split(';')[0]?.trim() ?? '')
      .filter(Boolean)
      .join('; ');
    if (!cookie) {
      throw new OlhoVivoAuthError('login accepted without a session cookie');
    }
    this.cookie = cookie;
    return cookie;
  }

  /**
   * Sends one HTTP request with a timeout and logs method, path, status and duration, never the query, token or cookie.
   */
  private async send(
    method: 'GET' | 'POST',
    path: string,
    query: Query,
    cookie?: string,
  ): Promise<RawResponse> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
    const started = this.now();
    const signal = AbortSignal.timeout(this.timeoutMs);
    let status: number;
    let text: string;
    let headers: Headers;
    try {
      const response = await this.fetch(url, {
        method,
        headers: cookie ? { Cookie: cookie } : {},
        signal,
      });
      status = response.status;
      headers = response.headers;
      text = await response.text();
    } catch {
      const durationMs = this.now() - started;
      const timedOut = signal.aborted;
      this.logger.warn(
        `${method} ${path} ${timedOut ? 'timeout' : 'network error'} after ${durationMs} ms`,
      );
      throw new OlhoVivoRequestError(
        timedOut ? 'timeout' : 'network',
        `${method} ${path} ${timedOut ? `timed out after ${this.timeoutMs} ms` : 'could not reach the API'}`,
        true,
      );
    }
    const durationMs = this.now() - started;
    const message = `${method} ${path} ${status} in ${durationMs} ms`;
    if (status >= 500 || status === 429) {
      this.logger.warn(message);
      throw new OlhoVivoRequestError(
        'http',
        `${method} ${path} returned ${status}`,
        true,
        status,
        retryAfterMs(headers),
      );
    }
    if (status >= 400 && status !== 401) {
      this.logger.warn(message);
      throw new OlhoVivoRequestError('http', `${method} ${path} returned ${status}`, false, status);
    }
    this.logger.log(message);
    return { status, text, headers, durationMs };
  }
}
