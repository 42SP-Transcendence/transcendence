import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from './database/database.module';
import { CollectionModule } from './modules/collection/collection.module';
import { PartitionsModule } from './modules/partitions/partitions.module';

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule, CollectionModule, PartitionsModule],
})
export class CollectorModule {}
