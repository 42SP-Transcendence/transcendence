import type { OperatingDay } from '@transcendence/core';

import { MaintainPositionPartitions } from './maintain-position-partitions.use-case';
import type { PositionPartitions } from './ports';

/**
 * Builds an in-memory partition store that already holds the given days.
 */
function store(
  existing: string[],
): PositionPartitions & { days: Set<string>; droppedBefore: string[] } {
  const days = new Set(existing);
  const droppedBefore: string[] = [];
  return {
    days,
    droppedBefore,
    ensure: (day: OperatingDay) => {
      const key = day.toString();
      const created = !days.has(key);
      days.add(key);
      return Promise.resolve(created);
    },
    dropBefore: (day: OperatingDay) => {
      const limit = day.toString();
      droppedBefore.push(limit);
      const old = [...days].filter((key) => key < limit);
      old.forEach((key) => days.delete(key));
      return Promise.resolve(old.length);
    },
  };
}

describe('MaintainPositionPartitions', () => {
  const now = new Date('2026-11-18T12:00:00-03:00');

  it('creates the partitions from yesterday to a week ahead', async () => {
    const partitions = store([]);

    const report = await new MaintainPositionPartitions(partitions, 30).execute(now);

    expect(report.created).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ]);
  });

  it('only reports the days it had to create', async () => {
    const partitions = store(['2026-11-17', '2026-11-18', '2026-11-19']);

    const report = await new MaintainPositionPartitions(partitions, 30).execute(now);

    expect(report.created[0]).toBe('2026-11-20');
    expect(report.created).toHaveLength(6);
  });

  it('keeps today plus the retention window and drops everything older', async () => {
    const partitions = store(['2026-10-18', '2026-10-19', '2026-11-01']);

    const report = await new MaintainPositionPartitions(partitions, 30).execute(now);

    expect(report.keptFrom).toBe('2026-10-19');
    expect(report.dropped).toBe(1);
    expect(partitions.days.has('2026-10-18')).toBe(false);
    expect(partitions.days.has('2026-10-19')).toBe(true);
  });

  it('uses the São Paulo day, not the UTC day, near midnight', async () => {
    const partitions = store([]);

    const report = await new MaintainPositionPartitions(partitions, 30).execute(
      new Date('2026-11-19T02:30:00Z'),
    );

    expect(report.created[1]).toBe('2026-11-18');
    expect(partitions.droppedBefore).toEqual(['2026-10-19']);
  });
});
