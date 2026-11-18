import { OperatingDay } from '@transcendence/core';
import type { PrismaClient } from '@transcendence/database';

import { PrismaPositionPartitions } from './prisma-position-partitions';

/**
 * Builds a Prisma double whose $queryRaw records the SQL and values and answers with the given rows.
 */
function prismaAnswering(rows: unknown[]): {
  prisma: Pick<PrismaClient, '$queryRaw'>;
  calls: { sql: string; values: unknown[] }[];
} {
  const calls: { sql: string; values: unknown[] }[] = [];
  const queryRaw = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ sql: strings.join('?').replace(/\s+/g, ' ').trim(), values });
    return Promise.resolve(rows);
  };
  return { prisma: { $queryRaw: queryRaw } as unknown as Pick<PrismaClient, '$queryRaw'>, calls };
}

describe('PrismaPositionPartitions', () => {
  const day = OperatingDay.parse('2026-11-18');

  it('calls the partition function with the day as a date and returns whether it created one', async () => {
    const { prisma, calls } = prismaAnswering([{ created: true }]);

    await expect(new PrismaPositionPartitions(prisma).ensure(day)).resolves.toBe(true);
    expect(calls).toEqual([
      {
        sql: 'SELECT ensure_vehicle_positions_partition(?::date) AS created',
        values: ['2026-11-18'],
      },
    ]);
  });

  it('returns how many partitions were dropped before the day', async () => {
    const { prisma, calls } = prismaAnswering([{ dropped: 2 }]);

    await expect(new PrismaPositionPartitions(prisma).dropBefore(day)).resolves.toBe(2);
    expect(calls[0]?.sql).toBe(
      'SELECT drop_vehicle_positions_partitions_before(?::date) AS dropped',
    );
  });
});
