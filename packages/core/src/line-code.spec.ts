import { InvalidValueError } from './invalid-value.error.js';
import { LineCode } from './line-code.js';

describe('LineCode', () => {
  it('builds from the Olho Vivo sign and type', () => {
    const line = LineCode.of('8000', 10);

    expect(line.sign).toBe('8000');
    expect(line.type).toBe(10);
    expect(line.toString()).toBe('8000-10');
  });

  it('parses the GTFS route_id and matches the same line from Olho Vivo', () => {
    expect(LineCode.parse('8000-1').equals(LineCode.of('8000', 1))).toBe(true);
    expect(LineCode.parse(' 1012-21 ').toString()).toBe('1012-21');
  });

  it('normalizes letters to upper case', () => {
    expect(LineCode.parse('n101-11').toString()).toBe('N101-11');
  });

  it('rejects malformed codes', () => {
    for (const value of ['8000', '8000-', '-10', '8000-100', '80 00-10', 'CPTM L07']) {
      expect(() => LineCode.parse(value)).toThrow(InvalidValueError);
    }
    expect(() => LineCode.of('8000', 0)).toThrow(InvalidValueError);
    expect(() => LineCode.of('8000', 1.5)).toThrow(InvalidValueError);
  });

  it('is immutable', () => {
    expect(Object.isFrozen(LineCode.of('8000', 10))).toBe(true);
  });
});
