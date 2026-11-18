import { OperatingDay } from '@transcendence/core';

import type { PositionPartitions } from './ports';

const DAYS_AHEAD = 7;

export type MaintenanceReport = {
  created: string[];
  dropped: number;
  keptFrom: string;
};

/**
 * Moves a day by a whole number of days, forward or backward.
 */
function shift(day: OperatingDay, days: number): OperatingDay {
  let result = day;
  for (let i = 0; i < Math.abs(days); i += 1) {
    result = days > 0 ? result.next() : result.previous();
  }
  return result;
}

export class MaintainPositionPartitions {
  /**
   * Receives the partition store and how many past days of positions to keep besides today.
   */
  constructor(
    private readonly partitions: PositionPartitions,
    private readonly retentionDays: number,
  ) {}

  /**
   * Creates the partitions from yesterday to a week ahead and drops those older than the retention window, in São Paulo days.
   */
  async execute(now: Date): Promise<MaintenanceReport> {
    const today = OperatingDay.containing(now);
    const created: string[] = [];
    for (let offset = -1; offset <= DAYS_AHEAD; offset += 1) {
      const day = shift(today, offset);
      if (await this.partitions.ensure(day)) {
        created.push(day.toString());
      }
    }
    const keptFrom = shift(today, -this.retentionDays);
    const dropped = await this.partitions.dropBefore(keptFrom);
    return { created, dropped, keptFrom: keptFrom.toString() };
  }
}
