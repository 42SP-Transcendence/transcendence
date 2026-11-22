import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { RunDueCollections } from '../application/run-due-collections.use-case';

const TICK_MS = 5_000;

export const COLLECTION_ENABLED = Symbol('COLLECTION_ENABLED');

@Injectable()
export class CollectionScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CollectionScheduler.name);

  /**
   * Receives the use case that polls the due collections and whether polling is on, which needs an Olho Vivo token.
   */
  constructor(
    private readonly runDue: RunDueCollections,
    @Inject(COLLECTION_ENABLED) private readonly enabled: boolean,
  ) {}

  /**
   * Warns once at startup when collection is off, so a missing token is visible without flooding the log.
   */
  onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.warn(
        'collection is off: SPTRANS_API_TOKEN is not set, so the Olho Vivo API is never called',
      );
    }
  }

  /**
   * Every five seconds, polls the collections that are due; a failed tick is logged and the next one tries again. Does nothing while collection is off.
   */
  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      const report = await this.runDue.execute(new Date());
      if (report.finished > 0) {
        this.logger.log(`finished ${report.finished} collection(s) whose day ended`);
      }
      const failures = report.polled.filter(
        ({ outcome }) => outcome !== 'ok' && outcome !== 'empty',
      );
      for (const { jobId, outcome } of failures) {
        this.logger.warn(`collection ${jobId}: ${outcome}`);
      }
    } catch (error) {
      this.logger.error(`collection tick failed: ${(error as Error).message}`);
    }
  }
}
