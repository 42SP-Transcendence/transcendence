import type { MaintainPositionPartitions } from '../application/maintain-position-partitions.use-case';
import { PartitionMaintenanceScheduler } from './partition-maintenance.scheduler';

/**
 * Builds a scheduler over a use case double that counts its runs and answers with the given result.
 */
function schedulerWith(result: () => Promise<unknown>): {
  scheduler: PartitionMaintenanceScheduler;
  runs: () => number;
} {
  let count = 0;
  const maintain = {
    execute: () => {
      count += 1;
      return result();
    },
  } as unknown as MaintainPositionPartitions;
  return { scheduler: new PartitionMaintenanceScheduler(maintain), runs: () => count };
}

describe('PartitionMaintenanceScheduler', () => {
  it('runs the maintenance when the collector boots', async () => {
    const { scheduler, runs } = schedulerWith(() =>
      Promise.resolve({ created: [], dropped: 0, keptFrom: '2026-10-19' }),
    );

    await scheduler.onApplicationBootstrap();

    expect(runs()).toBe(1);
  });

  it('logs a failure instead of crashing the collector', async () => {
    const { scheduler, runs } = schedulerWith(() => Promise.reject(new Error('database is down')));

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(runs()).toBe(1);
  });
});
