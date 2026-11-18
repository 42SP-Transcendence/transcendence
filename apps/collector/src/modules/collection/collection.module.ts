import { Module } from '@nestjs/common';
import type { PrismaClient } from '@transcendence/database';

import { loadCollectorEnv } from '../../config/env';
import { PRISMA } from '../../database/database.module';
import { COLLECTION_JOBS, type CollectionJobs } from './application/collection-jobs';
import { RequestCollection } from './application/request-collection.use-case';
import { RunDueCollections } from './application/run-due-collections.use-case';
import { TRANSIT_DATA_SOURCE, type TransitDataSource } from './application/transit-data-source';
import { OlhoVivoAdapter } from './infrastructure/olho-vivo/olho-vivo.adapter';
import { OlhoVivoHttpClient } from './infrastructure/olho-vivo/olho-vivo-http.client';
import { PrismaCollectionJobs } from './infrastructure/prisma-collection-jobs';
import { CollectionScheduler } from './presentation/collection.scheduler';

@Module({
  providers: [
    {
      provide: OlhoVivoHttpClient,
      useFactory: () => new OlhoVivoHttpClient({ token: loadCollectorEnv().SPTRANS_API_TOKEN }),
    },
    {
      provide: TRANSIT_DATA_SOURCE,
      useFactory: (client: OlhoVivoHttpClient) => new OlhoVivoAdapter(client),
      inject: [OlhoVivoHttpClient],
    },
    {
      provide: COLLECTION_JOBS,
      useFactory: (prisma: PrismaClient) => new PrismaCollectionJobs(prisma),
      inject: [PRISMA],
    },
    {
      provide: RequestCollection,
      useFactory: (jobs: CollectionJobs) => new RequestCollection(jobs),
      inject: [COLLECTION_JOBS],
    },
    {
      provide: RunDueCollections,
      useFactory: (jobs: CollectionJobs, source: TransitDataSource) =>
        new RunDueCollections(jobs, source),
      inject: [COLLECTION_JOBS, TRANSIT_DATA_SOURCE],
    },
    CollectionScheduler,
  ],
  exports: [TRANSIT_DATA_SOURCE, RequestCollection],
})
export class CollectionModule {}
