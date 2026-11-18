import type { RunDueCollections } from '../application/run-due-collections.use-case';
import { CollectionScheduler } from './collection.scheduler';

describe('CollectionScheduler', () => {
  it('runs the due collections on each tick', async () => {
    let runs = 0;
    const runDue = {
      execute: () => {
        runs += 1;
        return Promise.resolve({ finished: 0, polled: [{ jobId: 'job-1', outcome: 'stale' }] });
      },
    } as unknown as RunDueCollections;

    await new CollectionScheduler(runDue).tick();

    expect(runs).toBe(1);
  });

  it('survives a failed tick so the next one can try again', async () => {
    const runDue = {
      execute: () => Promise.reject(new Error('database is down')),
    } as unknown as RunDueCollections;

    await expect(new CollectionScheduler(runDue).tick()).resolves.toBeUndefined();
  });
});
