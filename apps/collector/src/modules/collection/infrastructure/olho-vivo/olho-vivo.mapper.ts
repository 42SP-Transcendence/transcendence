import { Direction, LineCode } from '@transcendence/core';

import type { LineVariant, VehiclePosition } from '../../application/transit-data-source';

export class OlhoVivoMappingError extends Error {
  /**
   * Signals a response whose shape does not match the Olho Vivo contract.
   */
  constructor(message: string) {
    super(message);
    this.name = 'OlhoVivoMappingError';
  }
}

type Fields = Record<string, unknown>;

/**
 * Tells whether a value is a plain JSON object.
 */
function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns a finite number inside the range, or fails with the field name.
 */
function numberIn(fields: Fields, key: string, min: number, max: number): number {
  const value = fields[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new OlhoVivoMappingError(`invalid ${key}: ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Returns a text field, or fails with the field name.
 */
function text(fields: Fields, key: string): string {
  const value = fields[key];
  if (typeof value !== 'string') {
    throw new OlhoVivoMappingError(`invalid ${key}: ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Returns a boolean field, or fails with the field name.
 */
function flag(fields: Fields, key: string): boolean {
  const value = fields[key];
  if (typeof value !== 'boolean') {
    throw new OlhoVivoMappingError(`invalid ${key}: ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Converts one vehicle: p is the prefix, ta the UTC time of the reading, py and px the coordinates, a the accessibility flag.
 */
function toVehicle(value: unknown): VehiclePosition {
  if (!isObject(value)) {
    throw new OlhoVivoMappingError('vehicle is not an object');
  }
  const prefix = typeof value.p === 'number' ? String(value.p) : text(value, 'p').trim();
  if (!prefix) {
    throw new OlhoVivoMappingError('vehicle without prefix');
  }
  const observedAt = new Date(text(value, 'ta'));
  if (Number.isNaN(observedAt.getTime())) {
    throw new OlhoVivoMappingError(`invalid ta: ${JSON.stringify(value.ta)}`);
  }
  return {
    vehiclePrefix: prefix,
    observedAt,
    lat: numberIn(value, 'py', -90, 90),
    lon: numberIn(value, 'px', -180, 180),
    accessible: flag(value, 'a'),
  };
}

/**
 * Converts a /Posicao/Linha body; hr is the API clock as HH:MM, with no date, and an empty vs means no bus on the street.
 */
export function toPositions(body: unknown): {
  referenceClock: string;
  vehicles: VehiclePosition[];
} {
  if (!isObject(body)) {
    throw new OlhoVivoMappingError('positions response is not an object');
  }
  const referenceClock = text(body, 'hr');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(referenceClock)) {
    throw new OlhoVivoMappingError(`invalid hr: ${JSON.stringify(referenceClock)}`);
  }
  if (!Array.isArray(body.vs)) {
    throw new OlhoVivoMappingError('positions response without a vehicle list');
  }
  return { referenceClock, vehicles: body.vs.map(toVehicle) };
}

/**
 * Converts a /Linha/Buscar body and keeps the variants of the requested line: cl is the source id, lt and tl the line code, sl the direction, tp and ts the terminals.
 */
export function toLineVariants(body: unknown, line: LineCode): LineVariant[] {
  if (!Array.isArray(body)) {
    throw new OlhoVivoMappingError('line search response is not a list');
  }
  return body
    .map((item: unknown) => {
      if (!isObject(item)) {
        throw new OlhoVivoMappingError('line is not an object');
      }
      try {
        return {
          sourceId: numberIn(item, 'cl', 1, Number.MAX_SAFE_INTEGER),
          line: LineCode.of(text(item, 'lt'), numberIn(item, 'tl', 1, 99)),
          direction: Direction.of(numberIn(item, 'sl', 1, 2)),
          circular: flag(item, 'lc'),
          terminalMain: text(item, 'tp'),
          terminalSecondary: text(item, 'ts'),
        };
      } catch (error) {
        throw error instanceof OlhoVivoMappingError
          ? error
          : new OlhoVivoMappingError((error as Error).message);
      }
    })
    .filter((variant) => variant.line.equals(line));
}
