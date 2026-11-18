import type { OperatingDay } from '@transcendence/core';

import { firstPollAt } from '../domain/collection-window';
import type { CollectionJobs, ScheduledCollection } from './collection-jobs';

const DEFAULT_INTERVAL_SECS = 30;

export class CollectionDayOverError extends Error {
  /**
   * Signals a request for an operating day whose collection window has already closed.
   */
  constructor(readonly operatingDay: string) {
    super(`the collection of ${operatingDay} has already ended`);
    this.name = 'CollectionDayOverError';
  }
}

export class RequestCollection {
  /**
   * Receives the collection jobs, which are both the queue and the idempotency record.
   */
  constructor(private readonly jobs: CollectionJobs) {}

  /**
   * Schedules the collection of one line direction on one operating day, reusing the existing one when someone already asked for it.
   */
  async execute(
    lineVariantId: string,
    operatingDay: OperatingDay,
    now: Date,
  ): Promise<ScheduledCollection> {
    const firstPoll = firstPollAt(operatingDay, now);
    if (firstPoll === null) {
      throw new CollectionDayOverError(operatingDay.toString());
    }
    return this.jobs.schedule({
      lineVariantId,
      operatingDay,
      intervalSecs: DEFAULT_INTERVAL_SECS,
      firstPollAt: firstPoll,
    });
  }
}
