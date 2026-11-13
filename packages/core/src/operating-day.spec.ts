import { InvalidValueError } from './invalid-value.error.js';
import { OperatingDay } from './operating-day.js';

const HOUR = 3600;

describe('OperatingDay', () => {
  it('parses YYYY-MM-DD and rejects dates that do not exist', () => {
    expect(OperatingDay.parse('2026-11-13').toString()).toBe('2026-11-13');
    expect(() => OperatingDay.parse('2026-02-29')).toThrow(InvalidValueError);
    expect(() => OperatingDay.parse('13/11/2026')).toThrow(InvalidValueError);
    expect(() => OperatingDay.parse('2026-13-01')).toThrow(InvalidValueError);
  });

  it('turns GTFS times into São Paulo instants, three hours behind UTC', () => {
    const day = OperatingDay.parse('2026-11-13');

    expect(day.instantAt(7 * HOUR)).toEqual(new Date('2026-11-13T10:00:00Z'));
    expect(day.secondsOf(new Date('2026-11-13T10:00:00Z'))).toBe(7 * HOUR);
  });

  it('keeps a trip that crosses midnight on the day it departed', () => {
    const day = OperatingDay.parse('2026-11-13');
    const departure = day.instantAt(23 * HOUR + 50 * 60);
    const arrival = day.instantAt(24 * HOUR + 15 * 60);

    expect(departure).toEqual(new Date('2026-11-14T02:50:00Z'));
    expect(arrival).toEqual(new Date('2026-11-14T03:15:00Z'));
    expect(OperatingDay.containing(departure).equals(day)).toBe(true);
    expect(day.secondsOf(arrival)).toBe(87_300);
    expect(OperatingDay.containing(arrival).toString()).toBe('2026-11-14');
  });

  it('uses the São Paulo date, not the UTC date', () => {
    expect(OperatingDay.containing(new Date('2026-11-14T02:30:00Z')).toString()).toBe('2026-11-13');
    expect(OperatingDay.containing(new Date('2026-11-14T03:00:00Z')).toString()).toBe('2026-11-14');
  });

  it('follows the historical daylight-saving offset of America/Sao_Paulo', () => {
    const summer = OperatingDay.parse('2018-12-10');

    expect(summer.instantAt(8 * HOUR)).toEqual(new Date('2018-12-10T10:00:00Z'));
    expect(OperatingDay.containing(new Date('2018-12-11T01:30:00Z')).toString()).toBe('2018-12-10');
  });

  it('counts from noon minus 12 hours on the day daylight saving started', () => {
    const changeover = OperatingDay.parse('2018-11-04');

    expect(changeover.instantAt(12 * HOUR)).toEqual(new Date('2018-11-04T14:00:00Z'));
    expect(changeover.instantAt(0)).toEqual(new Date('2018-11-04T02:00:00Z'));
  });

  it('moves across months, years and leap days', () => {
    expect(OperatingDay.parse('2026-12-31').next().toString()).toBe('2027-01-01');
    expect(OperatingDay.parse('2028-03-01').previous().toString()).toBe('2028-02-29');
  });

  it('is immutable and compared by value', () => {
    const day = OperatingDay.parse('2026-11-13');

    expect(Object.isFrozen(day)).toBe(true);
    expect(day.equals(OperatingDay.parse('2026-11-13'))).toBe(true);
    expect(day.equals(day.next())).toBe(false);
  });

  it('rejects a time that is not a number', () => {
    expect(() => OperatingDay.parse('2026-11-13').instantAt(Number.NaN)).toThrow(InvalidValueError);
  });
});
