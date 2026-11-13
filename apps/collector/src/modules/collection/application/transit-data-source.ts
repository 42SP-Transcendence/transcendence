import type { Direction, LineCode } from '@transcendence/core';

export type VehiclePosition = {
  vehiclePrefix: string;
  observedAt: Date;
  lat: number;
  lon: number;
  accessible: boolean;
};

export type PositionsSnapshot = {
  referenceClock: string;
  vehicles: VehiclePosition[];
  raw: string;
  latencyMs: number;
};

export type LineVariant = {
  sourceId: number;
  line: LineCode;
  direction: Direction;
  circular: boolean;
  terminalMain: string;
  terminalSecondary: string;
};

export type TransitFailure = 'auth_failed' | 'collector_failed';

export class TransitDataSourceError extends Error {
  /**
   * Signals a query that produced no usable answer, already classified as a collection outcome.
   */
  constructor(
    readonly outcome: TransitFailure,
    message: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'TransitDataSourceError';
  }
}

export interface TransitDataSource {
  positions(sourceId: number): Promise<PositionsSnapshot>;
  lineVariants(line: LineCode): Promise<LineVariant[]>;
}

export const TRANSIT_DATA_SOURCE = Symbol('TRANSIT_DATA_SOURCE');
