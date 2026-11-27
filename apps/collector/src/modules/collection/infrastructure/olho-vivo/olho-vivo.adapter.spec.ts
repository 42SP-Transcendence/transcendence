import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LineCode } from '@transcendence/core';

import { TransitDataSourceError } from '../../application/transit-data-source';
import { CircuitOpenError } from './circuit-breaker';
import { OlhoVivoAdapter } from './olho-vivo.adapter';
import { OlhoVivoAuthError, OlhoVivoRequestError } from './olho-vivo.errors';
import type { OlhoVivoResponse } from './olho-vivo-http.client';

type Get = (path: string, query?: Record<string, string | number>) => Promise<OlhoVivoResponse>;

/**
 * Builds a response the way the HTTP client returns it, from a recorded fixture.
 */
function recorded(name: string): OlhoVivoResponse {
  const text = readFileSync(
    join(process.cwd(), '..', '..', 'fixtures', 'olho-vivo', `${name}.json`),
    'utf8',
  );
  return { status: 200, body: JSON.parse(text), text, durationMs: 44 };
}

/**
 * Builds an adapter over a fake client and records the requested paths and queries.
 */
function adapter(get: Get) {
  const requests: string[] = [];
  const instance = new OlhoVivoAdapter({
    get: (path, query = {}) => {
      requests.push(`${path}?${new URLSearchParams(query as Record<string, string>)}`);
      return get(path, query);
    },
  });
  return { instance, requests };
}

describe('OlhoVivoAdapter', () => {
  it('returns the positions of a line variant with the raw response and latency', async () => {
    const response = recorded('posicao-linha-2506');
    const { instance, requests } = adapter(async () => response);

    const snapshot = await instance.positions(2506);

    expect(requests).toEqual(['/Posicao/Linha?codigoLinha=2506']);
    expect(snapshot.referenceClock).toBe('00:18');
    expect(snapshot.vehicles).toHaveLength(1);
    expect(snapshot.raw).toBe(response.text);
    expect(snapshot.latencyMs).toBe(44);
  });

  it('treats a line without buses as a valid empty answer', async () => {
    const { instance } = adapter(async () => recorded('posicao-linha-35274'));

    await expect(instance.positions(35274)).resolves.toMatchObject({ vehicles: [] });
  });

  it('searches variants by the line sign and keeps the requested type', async () => {
    const { instance, requests } = adapter(async () => recorded('linha-buscar-8000'));

    const variants = await instance.lineVariants(LineCode.parse('8000-1'));

    expect(requests).toEqual(['/Linha/Buscar?termosBusca=8000']);
    expect(variants.map((variant) => [variant.sourceId, variant.direction.value])).toEqual([
      [2506, 1],
      [35274, 2],
    ]);
  });

  it('reports a refused token or session as auth_failed', async () => {
    const { instance } = adapter(async () => {
      throw new OlhoVivoAuthError('token refused by the Olho Vivo API');
    });

    await expect(instance.positions(2506)).rejects.toEqual(
      new TransitDataSourceError('auth_failed', 'token refused by the Olho Vivo API'),
    );
  });

  it('reports 5xx, 429, timeout, network error, an open circuit and a body that is not JSON as source_unavailable', async () => {
    const failures = [
      new OlhoVivoRequestError('http', 'GET /Posicao/Linha returned 503', true, 503),
      new OlhoVivoRequestError('http', 'GET /Posicao/Linha returned 429', true, 429),
      new OlhoVivoRequestError('timeout', 'GET /Posicao/Linha timed out after 10000 ms', true),
      new OlhoVivoRequestError('network', 'GET /Posicao/Linha could not reach the API', true),
      new CircuitOpenError(30_000),
      new OlhoVivoRequestError(
        'invalid_response',
        'GET /Posicao/Linha returned a body that is not JSON',
        false,
        200,
      ),
    ];
    for (const failure of failures) {
      const { instance } = adapter(async () => {
        throw failure;
      });

      await expect(instance.positions(2506)).rejects.toMatchObject({
        outcome: 'source_unavailable',
        message: failure.message,
      });
    }
  });

  it('reports an unexpected 4xx and an answer we cannot map as collector_failed', async () => {
    const refused = adapter(async () => {
      throw new OlhoVivoRequestError('http', 'GET /Posicao/Linha returned 404', false, 404);
    });
    await expect(refused.instance.positions(2506)).rejects.toMatchObject({
      outcome: 'collector_failed',
      httpStatus: 404,
    });

    const broken = adapter(async () => ({
      status: 200,
      body: { hr: '07:00' },
      text: '',
      durationMs: 1,
    }));
    await expect(broken.instance.positions(2506)).rejects.toMatchObject({
      outcome: 'collector_failed',
      message: 'positions response without a vehicle list',
    });
  });

  it('keeps the HTTP status on the error', async () => {
    const { instance } = adapter(async () => {
      throw new OlhoVivoRequestError('http', 'GET /Posicao/Linha returned 503', true, 503);
    });

    await expect(instance.positions(2506)).rejects.toMatchObject({
      outcome: 'source_unavailable',
      httpStatus: 503,
    });
  });

  it('lets unexpected errors through untouched', async () => {
    const bug = new TypeError('bug');
    const { instance } = adapter(async () => {
      throw bug;
    });

    await expect(instance.positions(2506)).rejects.toBe(bug);
  });
});
