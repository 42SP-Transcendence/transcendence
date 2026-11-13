import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@transcendence/database';

import { loadApiEnv } from '../config/env';

const PRISMA = Symbol('PRISMA');

/**
 * Builds the shared Prisma client from the validated DATABASE_URL.
 */
function prismaFactory(): PrismaClient {
  return createPrismaClient(loadApiEnv().DATABASE_URL);
}

@Global()
@Module({
  providers: [{ provide: PRISMA, useFactory: prismaFactory }],
  exports: [PRISMA],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Closes the database connection pool when the application shuts down.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
