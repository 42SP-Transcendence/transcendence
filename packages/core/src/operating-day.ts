import { InvalidValueError } from './invalid-value.error.js';

export const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const localClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/**
 * Returns how far São Paulo local time is ahead of UTC at the given instant, in milliseconds (negative in Brazil).
 */
function offsetAt(instantMs: number): number {
  const parts = Object.fromEntries(
    localClock.formatToParts(new Date(instantMs)).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

export class OperatingDay {
  /**
   * Keeps the calendar date, already validated.
   */
  private constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
  ) {
    Object.freeze(this);
  }

  /**
   * Parses a date in the YYYY-MM-DD form, rejecting dates that do not exist.
   */
  static parse(value: string): OperatingDay {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const [year, month, day] = [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      !match ||
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new InvalidValueError(`invalid operating day "${value}"`);
    }
    return new OperatingDay(year, month, day);
  }

  /**
   * Returns the São Paulo calendar day of an instant; a trip belongs to the day of its departure, even when it ends after midnight.
   */
  static containing(instant: Date): OperatingDay {
    return OperatingDay.parse(localDate.format(instant));
  }

  /**
   * Returns the instant at a GTFS time of this day, in seconds; values past 86 400 fall after midnight, on the next calendar day.
   */
  instantAt(seconds: number): Date {
    if (!Number.isFinite(seconds)) {
      throw new InvalidValueError(`invalid time of day "${seconds}"`);
    }
    return new Date(this.reference() + seconds * 1000);
  }

  /**
   * Returns the GTFS time of an instant counted from this day: negative before it starts, past 86 400 after midnight.
   */
  secondsOf(instant: Date): number {
    return Math.floor((instant.getTime() - this.reference()) / 1000);
  }

  /**
   * Returns the following calendar day.
   */
  next(): OperatingDay {
    return this.plusDays(1);
  }

  /**
   * Returns the previous calendar day.
   */
  previous(): OperatingDay {
    return this.plusDays(-1);
  }

  /**
   * Compares by value.
   */
  equals(other: OperatingDay): boolean {
    return this.toString() === other.toString();
  }

  /**
   * Returns the YYYY-MM-DD form, which also sorts in calendar order.
   */
  toString(): string {
    return `${String(this.year).padStart(4, '0')}-${String(this.month).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
  }

  /**
   * Returns the instant GTFS times are counted from: local noon minus 12 hours, so daylight-saving days still line up.
   */
  private reference(): number {
    const noonAsUtc = Date.UTC(this.year, this.month - 1, this.day, 12);
    const noon = noonAsUtc - offsetAt(noonAsUtc - offsetAt(noonAsUtc));
    return noon - 12 * HOUR_MS;
  }

  /**
   * Moves the calendar date by whole days.
   */
  private plusDays(days: number): OperatingDay {
    const date = new Date(Date.UTC(this.year, this.month - 1, this.day) + days * DAY_MS);
    return new OperatingDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
}
