import { Module } from '@nestjs/common';
import type { PrismaClient } from '@transcendence/database';

import { PRISMA } from '../../database/database.module';
import { ImportGtfs } from './application/import-gtfs.use-case';
import { SCHEDULE_REPOSITORY, type ScheduleRepository } from './application/ports';
import { PrismaScheduleRepository } from './infrastructure/prisma-schedule.repository';

@Module({
  providers: [
    {
      provide: SCHEDULE_REPOSITORY,
      useFactory: (prisma: PrismaClient) => new PrismaScheduleRepository(prisma),
      inject: [PRISMA],
    },
    {
      provide: ImportGtfs,
      useFactory: (schedules: ScheduleRepository) => new ImportGtfs(schedules),
      inject: [SCHEDULE_REPOSITORY],
    },
  ],
  exports: [ImportGtfs],
})
export class GtfsModule {}
