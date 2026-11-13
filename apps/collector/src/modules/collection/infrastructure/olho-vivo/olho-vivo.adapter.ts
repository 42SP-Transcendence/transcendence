import type { LineCode } from '@transcendence/core';

import {
  type LineVariant,
  type PositionsSnapshot,
  type TransitDataSource,
  TransitDataSourceError,
} from '../../application/transit-data-source';
import { CircuitOpenError } from './circuit-breaker';
import { OlhoVivoAuthError, OlhoVivoRequestError } from './olho-vivo.errors';
import { OlhoVivoMappingError, toLineVariants, toPositions } from './olho-vivo.mapper';
import type { OlhoVivoHttpClient, OlhoVivoResponse } from './olho-vivo-http.client';

/**
 * Turns client and mapping errors into the typed error of the port, keeping other errors as they are.
 */
function translate(error: unknown): unknown {
  if (error instanceof OlhoVivoAuthError) {
    return new TransitDataSourceError('auth_failed', error.message);
  }
  if (error instanceof OlhoVivoRequestError) {
    return new TransitDataSourceError('collector_failed', error.message, error.status);
  }
  if (error instanceof CircuitOpenError || error instanceof OlhoVivoMappingError) {
    return new TransitDataSourceError('collector_failed', error.message);
  }
  return error;
}

export class OlhoVivoAdapter implements TransitDataSource {
  /**
   * Receives the HTTP client that handles the session, retries and the circuit breaker.
   */
  constructor(private readonly client: Pick<OlhoVivoHttpClient, 'get'>) {}

  /**
   * Returns the buses of one line variant with the raw response kept for evidence; an empty list is a valid answer.
   */
  async positions(sourceId: number): Promise<PositionsSnapshot> {
    return this.call(
      () => this.client.get('/Posicao/Linha', { codigoLinha: sourceId }),
      (response) => ({
        ...toPositions(response.body),
        raw: response.text,
        latencyMs: response.durationMs,
      }),
    );
  }

  /**
   * Returns the variants of a line, one per direction, searching by its sign and keeping only the requested type.
   */
  async lineVariants(line: LineCode): Promise<LineVariant[]> {
    return this.call(
      () => this.client.get('/Linha/Buscar', { termosBusca: line.sign }),
      (response) => toLineVariants(response.body, line),
    );
  }

  /**
   * Runs a request and its mapping, reporting any failure as a TransitDataSourceError.
   */
  private async call<T>(
    request: () => Promise<OlhoVivoResponse>,
    map: (response: OlhoVivoResponse) => T,
  ): Promise<T> {
    try {
      return map(await request());
    } catch (error) {
      throw translate(error);
    }
  }
}
