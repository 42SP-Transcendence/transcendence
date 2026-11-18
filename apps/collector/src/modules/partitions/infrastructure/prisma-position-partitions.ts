import type { OperatingDay } from '@transcendence/core';
import type { PrismaClient } from '@transcendence/database';

import type { PositionPartitions } from '../application/ports';

export class PrismaPositionPartitions implements PositionPartitions {
  /**
   * Receives the shared Prisma client.
   */
  constructor(private readonly prisma: Pick<PrismaClient, '$queryRaw'>) {}

  /**
   * Creates the partition of one São Paulo day when it is missing, returning whether it was created.
   */
  async ensure(day: OperatingDay): Promise<boolean> {
    const [row] = await this.prisma.$queryRaw<{ created: boolean }[]>`
      SELECT ensure_vehicle_positions_partition(${day.toString()}::date) AS created`;
    return row?.created ?? false;
  }

  /**
   * Drops every daily partition before the given day, returning how many were dropped.
   */
  async dropBefore(day: OperatingDay): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ dropped: number }[]>`
      SELECT drop_vehicle_positions_partitions_before(${day.toString()}::date) AS dropped`;
    return row?.dropped ?? 0;
  }
}
