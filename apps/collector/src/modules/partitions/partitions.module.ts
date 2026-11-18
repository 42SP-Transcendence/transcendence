import { Module } from '@nestjs/common';
import type { PrismaClient } from '@transcendence/database';

import { loadCollectorEnv } from '../../config/env';
import { PRISMA } from '../../database/database.module';
import { MaintainPositionPartitions } from './application/maintain-position-partitions.use-case';
import { POSITION_PARTITIONS, type PositionPartitions } from './application/ports';
import { PrismaPositionPartitions } from './infrastructure/prisma-position-partitions';
import { PartitionMaintenanceScheduler } from './presentation/partition-maintenance.scheduler';

@Module({
  providers: [
    {
      provide: POSITION_PARTITIONS,
      useFactory: (prisma: PrismaClient) => new PrismaPositionPartitions(prisma),
      inject: [PRISMA],
    },
    {
      provide: MaintainPositionPartitions,
      useFactory: (partitions: PositionPartitions) =>
        new MaintainPositionPartitions(partitions, loadCollectorEnv().POSITIONS_RETENTION_DAYS),
      inject: [POSITION_PARTITIONS],
    },
    PartitionMaintenanceScheduler,
  ],
  exports: [POSITION_PARTITIONS],
})
export class PartitionsModule {}
