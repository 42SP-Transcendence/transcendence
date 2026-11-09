import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@transcendence/database';

export const PRISMA = Symbol('PRISMA');

/**
 * Builds the shared Prisma client from DATABASE_URL, failing at startup when it is missing.
 */
function prismaFactory(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return createPrismaClient(url);
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
