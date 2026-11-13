import { InvalidValueError } from './invalid-value.error.js';

export type DirectionValue = 1 | 2;

export class Direction {
  static readonly MAIN_TO_SECONDARY = new Direction(1);
  static readonly SECONDARY_TO_MAIN = new Direction(2);

  /**
   * Keeps the Olho Vivo direction number.
   */
  private constructor(readonly value: DirectionValue) {
    Object.freeze(this);
  }

  /**
   * Returns the direction for the Olho Vivo field sl: 1 goes from the main to the secondary terminal, 2 comes back.
   */
  static of(value: number): Direction {
    if (value === 1) {
      return Direction.MAIN_TO_SECONDARY;
    }
    if (value === 2) {
      return Direction.SECONDARY_TO_MAIN;
    }
    throw new InvalidValueError(`invalid direction "${value}", expected 1 or 2`);
  }

  /**
   * Returns the direction for the GTFS field direction_id, which counts from 0.
   */
  static fromGtfs(directionId: number): Direction {
    if (directionId !== 0 && directionId !== 1) {
      throw new InvalidValueError(`invalid GTFS direction_id "${directionId}", expected 0 or 1`);
    }
    return Direction.of(directionId + 1);
  }

  /**
   * Returns the GTFS direction_id, which is the Olho Vivo number minus one.
   */
  toGtfs(): 0 | 1 {
    return this.value === 1 ? 0 : 1;
  }

  /**
   * Returns the way back.
   */
  opposite(): Direction {
    return this.value === 1 ? Direction.SECONDARY_TO_MAIN : Direction.MAIN_TO_SECONDARY;
  }

  /**
   * Compares by value.
   */
  equals(other: Direction): boolean {
    return this.value === other.value;
  }

  /**
   * Returns the Olho Vivo number as text.
   */
  toString(): string {
    return String(this.value);
  }
}
