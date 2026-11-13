import { InvalidValueError } from './invalid-value.error.js';
import { TimeWindow } from './time-window.js';

const HOUR = 3600;

describe('TimeWindow', () => {
  it('includes the start and excludes the end', () => {
    const band = TimeWindow.of(4 * HOUR, 5 * HOUR);

    expect(band.contains(4 * HOUR)).toBe(true);
    expect(band.contains(5 * HOUR - 1)).toBe(true);
    expect(band.contains(5 * HOUR)).toBe(false);
    expect(band.durationSecs).toBe(HOUR);
    expect(band.toString()).toBe('04:00–05:00');
  });

  it('runs past midnight in GTFS time', () => {
    const lateNight = TimeWindow.of(23 * HOUR + 30 * 60, 24 * HOUR + 30 * 60);

    expect(lateNight.contains(24 * HOUR + 15 * 60)).toBe(true);
    expect(lateNight.toString()).toBe('23:30–24:30');
  });

  it('detects overlapping windows', () => {
    const morning = TimeWindow.of(6 * HOUR, 7 * HOUR);

    expect(morning.overlaps(TimeWindow.of(6 * HOUR + 30 * 60, 8 * HOUR))).toBe(true);
    expect(morning.overlaps(TimeWindow.of(7 * HOUR, 8 * HOUR))).toBe(false);
  });

  it('rejects empty, reversed, negative or too long windows', () => {
    expect(() => TimeWindow.of(HOUR, HOUR)).toThrow(InvalidValueError);
    expect(() => TimeWindow.of(2 * HOUR, HOUR)).toThrow(InvalidValueError);
    expect(() => TimeWindow.of(-1, HOUR)).toThrow(InvalidValueError);
    expect(() => TimeWindow.of(0, 48 * HOUR + 1)).toThrow(InvalidValueError);
    expect(() => TimeWindow.of(0.5, HOUR)).toThrow(InvalidValueError);
  });

  it('is immutable and compared by value', () => {
    const band = TimeWindow.of(0, HOUR);

    expect(Object.isFrozen(band)).toBe(true);
    expect(band.equals(TimeWindow.of(0, HOUR))).toBe(true);
  });
});
