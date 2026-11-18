import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { RunDueCollections } from '../application/run-due-collections.use-case';

const TICK_MS = 5_000;

@Injectable()
export class CollectionScheduler {
  private readonly logger = new Logger(CollectionScheduler.name);

  /**
   * Receives the use case that polls the due collections.
   */
  constructor(private readonly runDue: RunDueCollections) {}

  /**
   * Every five seconds, polls the collections that are due; a failed tick is logged and the next one tries again.
   */
  @Interval(TICK_MS)
  async tick(): Promise<void> {
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
