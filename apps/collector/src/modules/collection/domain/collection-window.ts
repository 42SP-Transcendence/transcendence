import { OperatingDay } from '@transcendence/core';

export type CollectionWindow = { start: Date; end: Date };

/**
 * Returns when the collection of an operating day runs: from its São Paulo midnight to the next one.
 */
export function collectionWindow(day: OperatingDay): CollectionWindow {
  return { start: day.instantAt(0), end: day.next().instantAt(0) };
}

/**
 * Returns when the first poll of a newly requested collection is due: right away during its day, at the day's start before it, never after it ends.
 */
export function firstPollAt(day: OperatingDay, now: Date): Date | null {
  const { start, end } = collectionWindow(day);
  if (now >= end) {
    return null;
  }
  return now > start ? now : start;
}
