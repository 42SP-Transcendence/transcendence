import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { CollectionModule } from './modules/collection/collection.module';

@Module({
  imports: [DatabaseModule, CollectionModule],
})
export class CollectorModule {}
