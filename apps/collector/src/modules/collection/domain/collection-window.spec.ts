import { OperatingDay } from '@transcendence/core';

import { collectionWindow, firstPollAt } from './collection-window';

describe('collection window', () => {
  const day = OperatingDay.parse('2026-11-18');

  it('runs from São Paulo midnight to the next one', () => {
    expect(collectionWindow(day)).toEqual({
      start: new Date('2026-11-18T03:00:00Z'),
      end: new Date('2026-11-19T03:00:00Z'),
    });
  });

  it('starts right away when requested during the day', () => {
    const now = new Date('2026-11-18T15:00:00Z');

    expect(firstPollAt(day, now)).toEqual(now);
  });

  it('waits for the day to start when requested in advance', () => {
    expect(firstPollAt(day, new Date('2026-11-17T20:00:00Z'))).toEqual(
      new Date('2026-11-18T03:00:00Z'),
    );
  });

  it('refuses a day that has already ended', () => {
    expect(firstPollAt(day, new Date('2026-11-19T03:00:00Z'))).toBeNull();
  });
});
