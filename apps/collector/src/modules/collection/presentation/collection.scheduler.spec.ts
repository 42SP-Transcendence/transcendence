import { ConsoleLogger, Logger, type LoggerService } from '@nestjs/common';

import type { RunDueCollections } from '../application/run-due-collections.use-case';
import { CollectionScheduler } from './collection.scheduler';

/**
 * Builds a use case double that counts how many times the scheduler ran it.
 */
function countingRunDue(): { runDue: RunDueCollections; runs: () => number } {
  let runs = 0;
  const runDue = {
    execute: () => {
      runs += 1;
      return Promise.resolve({ finished: 0, polled: [{ jobId: 'job-1', outcome: 'stale' }] });
    },
  } as unknown as RunDueCollections;
  return { runDue, runs: () => runs };
}

/**
 * Routes Nest logs to a list while the callback runs, then restores the default console logger.
 */
function captureWarnings(run: () => void): string[] {
  const warnings: string[] = [];
  const capture: LoggerService = {
    log: () => undefined,
    error: () => undefined,
    warn: (message: string) => {
      warnings.push(message);
    },
  };
  Logger.overrideLogger(capture);
  try {
    run();
  } finally {
    Logger.overrideLogger(new ConsoleLogger());
  }
  return warnings;
}

describe('CollectionScheduler', () => {
  it('runs the due collections on each tick', async () => {
    const { runDue, runs } = countingRunDue();

    await new CollectionScheduler(runDue, true).tick();

    expect(runs()).toBe(1);
  });

  it('survives a failed tick so the next one can try again', async () => {
    const runDue = {
      execute: () => Promise.reject(new Error('database is down')),
    } as unknown as RunDueCollections;

    await expect(new CollectionScheduler(runDue, true).tick()).resolves.toBeUndefined();
  });

  it('never polls while collection is off', async () => {
    const { runDue, runs } = countingRunDue();
    const scheduler = new CollectionScheduler(runDue, false);

    await scheduler.tick();
    await scheduler.tick();

    expect(runs()).toBe(0);
  });

  it('warns once at startup only when collection is off', () => {
    const { runDue } = countingRunDue();

    expect(
      captureWarnings(() => new CollectionScheduler(runDue, false).onApplicationBootstrap()),
    ).toEqual([
      'collection is off: SPTRANS_API_TOKEN is not set, so the Olho Vivo API is never called',
    ]);
    expect(
      captureWarnings(() => new CollectionScheduler(runDue, true).onApplicationBootstrap()),
    ).toEqual([]);
  });
});
