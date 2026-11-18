import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MaintainPositionPartitions } from '../application/maintain-position-partitions.use-case';

@Injectable()
export class PartitionMaintenanceScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(PartitionMaintenanceScheduler.name);

  /**
   * Receives the use case that creates and drops the daily partitions.
   */
  constructor(private readonly maintain: MaintainPositionPartitions) {}

  /**
   * Prepares the partitions before the first collection runs.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.run();
  }

  /**
   * Repeats the maintenance every hour, so the next days always exist and expired days go away.
   */
  @Cron(CronExpression.EVERY_HOUR, { timeZone: 'America/Sao_Paulo' })
  async run(): Promise<void> {
    try {
      const report = await this.maintain.execute(new Date());
      if (report.created.length > 0 || report.dropped > 0) {
        this.logger.log(
          `position partitions: created ${report.created.join(', ') || 'none'}, dropped ${report.dropped} older than ${report.keptFrom}`,
        );
      }
    } catch (error) {
      this.logger.error(`position partition maintenance failed: ${(error as Error).message}`);
    }
  }
}
