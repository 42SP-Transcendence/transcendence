import { Direction } from './direction.js';
import { InvalidValueError } from './invalid-value.error.js';

describe('Direction', () => {
  it('maps the Olho Vivo sl 1 and 2 to GTFS direction_id 0 and 1', () => {
    expect(Direction.of(1).toGtfs()).toBe(0);
    expect(Direction.of(2).toGtfs()).toBe(1);
    expect(Direction.fromGtfs(0)).toBe(Direction.MAIN_TO_SECONDARY);
    expect(Direction.fromGtfs(1)).toBe(Direction.SECONDARY_TO_MAIN);
  });

  it('returns the way back', () => {
    expect(Direction.of(1).opposite()).toBe(Direction.of(2));
    expect(Direction.of(2).opposite().equals(Direction.of(1))).toBe(true);
  });

  it('rejects other values', () => {
    expect(() => Direction.of(0)).toThrow(InvalidValueError);
    expect(() => Direction.of(3)).toThrow(InvalidValueError);
    expect(() => Direction.fromGtfs(2)).toThrow(InvalidValueError);
  });

  it('is immutable', () => {
    expect(Object.isFrozen(Direction.of(1))).toBe(true);
  });
});
