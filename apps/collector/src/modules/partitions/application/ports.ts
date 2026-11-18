import type { OperatingDay } from '@transcendence/core';

export interface PositionPartitions {
  ensure(day: OperatingDay): Promise<boolean>;
  dropBefore(day: OperatingDay): Promise<number>;
}

export const POSITION_PARTITIONS = Symbol('POSITION_PARTITIONS');
