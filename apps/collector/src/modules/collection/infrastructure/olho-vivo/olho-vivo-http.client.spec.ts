import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';
import { OlhoVivoAuthError, OlhoVivoRequestError } from './olho-vivo.errors';
import { OlhoVivoHttpClient } from './olho-vivo-http.client';

const TOKEN = 'a'.repeat(64);
const COOKIE = 'apiCredentials=session-1';

type Call = { method: string; url: URL; cookie: string | undefined };
type Reply = (call: Call, signal: AbortSignal) => Promise<Response> | Response;

const fixture = readFileSync(
  join(process.cwd(), '..', '..', 'fixtures', 'olho-vivo', 'linha-buscar-8000.json'),
  'utf8',
);

/**
 * Answers a login with true and a session cookie, as the real API does.
 */
function loginOk(cookie = COOKIE): Reply {
  return () =>
    new Response('true', { status: 200, headers: { 'Set-Cookie': `${cookie}; path=/; HttpOnly` } });
}

/**
 * Answers with the given status and body.
 */
function reply(status: number, body = '', headers: Record<string, string> = {}): Reply {
  return () => new Response(body, { status, headers });
}

/**
 * Never answers until the request is aborted, like a hanging connection.
 */
function hang(): Reply {
  return (_call, signal) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(signal.reason)),
    );
}

/**
 * Builds a fake fetch that serves the replies in order and records every request.
 */
function fakeFetch(replies: Reply[]) {
  const calls: Call[] = [];
  const queue = [...replies];
  const fetch = (async (input: URL, init: RequestInit) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const call = { method: init.method ?? 'GET', url: new URL(input), cookie: headers.Cookie };
    calls.push(call);
    const next = queue.shift();
    if (!next) {
      throw new Error(`unexpected request ${call.method} ${call.url.pathname}`);
    }
    return next(call, init.signal as AbortSignal);
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

/**
 * Creates a client with fake fetch, recorded sleeps and recorded logs.
 */
function client(
  replies: Reply[],
  options: { retries?: number; timeoutMs?: number; breaker?: CircuitBreaker; token?: string } = {},
) {
  const { fetch, calls } = fakeFetch(replies);
  const sleeps: number[] = [];
  const logs: string[] = [];
  const instance = new OlhoVivoHttpClient({
    token: 'token' in options ? options.token : TOKEN,
    fetch,
    retries: options.retries,
    timeoutMs: options.timeoutMs,
    breaker: options.breaker,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    logger: {
      log: (message: string) => logs.push(message),
      warn: (message: string) => logs.push(message),
    },
  });
  return { instance, calls, sleeps, logs };
}

describe('OlhoVivoHttpClient', () => {
  it('logs in once and reuses the session cookie', async () => {
    const { instance, calls } = client([
      loginOk(),
      reply(200, fixture),
      reply(200, '{"hr":"00:18","vs":[]}'),
    ]);

    const first = await instance.get('/Linha/Buscar', { termosBusca: '8000' });
    await instance.get('/Posicao/Linha', { codigoLinha: 35274 });

    expect(first.body).toEqual(JSON.parse(fixture));
    expect(first.text).toBe(fixture);
    expect(calls.map((call) => `${call.method} ${call.url.pathname}`)).toEqual([
      'POST /v2.1/Login/Autenticar',
      'GET /v2.1/Linha/Buscar',
      'GET /v2.1/Posicao/Linha',
    ]);
    expect(calls[0]?.url.searchParams.get('token')).toBe(TOKEN);
    expect(calls[0]?.url.protocol).toBe('https:');
    expect(calls[1]?.cookie).toBe(COOKIE);
    expect(calls[2]?.url.searchParams.get('codigoLinha')).toBe('35274');
  });

  it('logs in again and repeats the call once when the session expired', async () => {
    const { instance, calls } = client([
      loginOk(),
      reply(200, fixture),
      reply(401, '{"Message":"Authorization has been denied for this request."}'),
      loginOk('apiCredentials=session-2'),
      reply(200, fixture),
    ]);

    await instance.get('/Linha/Buscar', { termosBusca: '8000' });
    const response = await instance.get('/Linha/Buscar', { termosBusca: '8000' });

    expect(response.status).toBe(200);
    expect(calls.map((call) => call.cookie)).toEqual([
      undefined,
      COOKIE,
      COOKIE,
      undefined,
      'apiCredentials=session-2',
    ]);
  });

  it('fails with an auth error when the new session is refused too', async () => {
    const { instance } = client([loginOk(), reply(401), loginOk(), reply(401)]);

    await expect(instance.get('/Linha/Buscar')).rejects.toBeInstanceOf(OlhoVivoAuthError);
  });

  it('does not retry when the token is refused', async () => {
    const { instance, calls, sleeps } = client([reply(200, 'false')]);

    await expect(instance.get('/Linha/Buscar')).rejects.toThrow(
      'token refused by the Olho Vivo API',
    );
    expect(calls).toHaveLength(1);
    expect(sleeps).toEqual([]);
  });

  it('does not call the API without a token', async () => {
    const { instance, calls } = client([], { token: undefined });

    await expect(instance.get('/Linha/Buscar')).rejects.toThrow('SPTRANS_API_TOKEN is not set');
    expect(calls).toEqual([]);
  });

  it('retries 5xx errors waiting 1, 2 and 4 seconds', async () => {
    const { instance, sleeps } = client([
      loginOk(),
      reply(502),
      reply(503),
      reply(500),
      reply(200, fixture),
    ]);

    const response = await instance.get('/Linha/Buscar');

    expect(response.status).toBe(200);
    expect(sleeps).toEqual([1_000, 2_000, 4_000]);
  });

  it('gives up after the last retry and reports the status', async () => {
    const { instance, calls } = client([loginOk(), reply(503), reply(503), reply(503), reply(503)]);

    const error = await instance.get('/Linha/Buscar').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OlhoVivoRequestError);
    expect(error).toMatchObject({ failure: 'http', status: 503, retryable: true });
    expect(calls).toHaveLength(5);
  });

  it('waits as long as Retry-After asks after a 429', async () => {
    const { instance, sleeps } = client([
      loginOk(),
      reply(429, '', { 'Retry-After': '7' }),
      reply(200, fixture),
    ]);

    await instance.get('/Linha/Buscar');

    expect(sleeps).toEqual([7_000]);
  });

  it('times out a hanging request and retries it', async () => {
    const { instance, calls } = client([loginOk(), hang(), hang()], { retries: 1, timeoutMs: 20 });

    const error = await instance
      .get('/Posicao/Linha', { codigoLinha: 2506 })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ failure: 'timeout', retryable: true });
    expect(calls).toHaveLength(3);
  });

  it('does not retry other 4xx errors or a body that is not JSON', async () => {
    const notFound = client([loginOk(), reply(404)]);
    const notJson = client([loginOk(), reply(200, '<html>maintenance</html>')]);

    await expect(notFound.instance.get('/Linha/Buscar')).rejects.toMatchObject({
      status: 404,
      retryable: false,
    });
    await expect(notJson.instance.get('/Linha/Buscar')).rejects.toMatchObject({
      failure: 'invalid_response',
    });
    expect(notFound.sleeps).toEqual([]);
    expect(notJson.sleeps).toEqual([]);
  });

  it('shares one login between calls made at the same time', async () => {
    const { instance, calls } = client([loginOk(), reply(200, fixture), reply(200, fixture)]);

    await Promise.all([instance.get('/Linha/Buscar'), instance.get('/Linha/Buscar')]);

    expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);
  });

  it('stops calling the API while the circuit is open', async () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 2, openMs: 60_000, now: () => now });
    const { instance, calls } = client([loginOk(), reply(503), reply(503), reply(200, fixture)], {
      retries: 0,
      breaker,
    });

    await expect(instance.get('/Linha/Buscar')).rejects.toBeInstanceOf(OlhoVivoRequestError);
    await expect(instance.get('/Linha/Buscar')).rejects.toBeInstanceOf(OlhoVivoRequestError);
    await expect(instance.get('/Linha/Buscar')).rejects.toBeInstanceOf(CircuitOpenError);
    expect(calls).toHaveLength(3);

    now = 60_000;
    await expect(instance.get('/Linha/Buscar')).resolves.toMatchObject({ status: 200 });
    expect(breaker.state).toBe('closed');
  });

  it('logs status and duration without the token, the cookie or the query', async () => {
    const { instance, logs } = client([loginOk(), reply(503), reply(200, fixture)]);

    await instance.get('/Linha/Buscar', { termosBusca: '8000' });

    expect(logs).toEqual([
      expect.stringMatching(/^POST \/Login\/Autenticar 200 in \d+ ms$/),
      expect.stringMatching(/^GET \/Linha\/Buscar 503 in \d+ ms$/),
      expect.stringMatching(/^GET \/Linha\/Buscar 200 in \d+ ms$/),
    ]);
    expect(logs.join('\n')).not.toMatch(new RegExp(`${TOKEN}|session-1|termosBusca`));
  });
});
