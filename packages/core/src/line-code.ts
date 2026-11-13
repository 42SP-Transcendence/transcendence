import { InvalidValueError } from './invalid-value.error.js';

const SIGN = /^[0-9A-Z]{2,6}$/;
const ROUTE_ID = /^([0-9A-Z]{2,6})-(\d{1,2})$/;

export class LineCode {
  /**
   * Keeps the two parts of the sign, already validated.
   */
  private constructor(
    readonly sign: string,
    readonly type: number,
  ) {
    Object.freeze(this);
  }

  /**
   * Builds a line code from the Olho Vivo fields lt (sign, such as 8000) and tl (type, such as 10).
   */
  static of(sign: string, type: number): LineCode {
    const normalized = sign.trim().toUpperCase();
    if (!SIGN.test(normalized)) {
      throw new InvalidValueError(`invalid line sign "${sign}"`);
    }
    if (!Number.isInteger(type) || type < 1 || type > 99) {
      throw new InvalidValueError(`invalid line type "${type}"`);
    }
    return new LineCode(normalized, type);
  }

  /**
   * Parses the GTFS route_id form, such as 8000-10.
   */
  static parse(value: string): LineCode {
    const match = ROUTE_ID.exec(value.trim().toUpperCase());
    if (!match?.[1] || !match[2]) {
      throw new InvalidValueError(`invalid line code "${value}"`);
    }
    return LineCode.of(match[1], Number(match[2]));
  }

  /**
   * Compares by value.
   */
  equals(other: LineCode): boolean {
    return this.sign === other.sign && this.type === other.type;
  }

  /**
   * Returns the GTFS route_id form, such as 8000-10.
   */
  toString(): string {
    return `${this.sign}-${this.type}`;
  }
}
