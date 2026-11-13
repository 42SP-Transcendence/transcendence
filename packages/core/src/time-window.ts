import { InvalidValueError } from './invalid-value.error.js';

const MAX_SECONDS = 48 * 3600;

/**
 * Formats GTFS seconds as HH:MM, keeping hours past 24 as GTFS does.
 */
function clock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export class TimeWindow {
  /**
   * Keeps the start and the end, already validated.
   */
  private constructor(
    readonly startSecs: number,
    readonly endSecs: number,
  ) {
    Object.freeze(this);
  }

  /**
   * Builds a window of a service day in GTFS seconds, start included and end excluded; it may run past midnight up to 48:00.
   */
  static of(startSecs: number, endSecs: number): TimeWindow {
    if (!Number.isInteger(startSecs) || !Number.isInteger(endSecs)) {
      throw new InvalidValueError('time window bounds must be whole seconds');
    }
    if (startSecs < 0 || endSecs > MAX_SECONDS || startSecs >= endSecs) {
      throw new InvalidValueError(`invalid time window ${startSecs}–${endSecs}`);
    }
    return new TimeWindow(startSecs, endSecs);
  }

  /**
   * Returns the length of the window in seconds.
   */
  get durationSecs(): number {
    return this.endSecs - this.startSecs;
  }

  /**
   * Tells whether a GTFS time falls inside the window.
   */
  contains(seconds: number): boolean {
    return seconds >= this.startSecs && seconds < this.endSecs;
  }

  /**
   * Tells whether two windows share any second.
   */
  overlaps(other: TimeWindow): boolean {
    return this.startSecs < other.endSecs && other.startSecs < this.endSecs;
  }

  /**
   * Compares by value.
   */
  equals(other: TimeWindow): boolean {
    return this.startSecs === other.startSecs && this.endSecs === other.endSecs;
  }

  /**
   * Returns the HH:MM–HH:MM form, such as 04:00–05:00 or 23:30–24:30.
   */
  toString(): string {
    return `${clock(this.startSecs)}–${clock(this.endSecs)}`;
  }
}
