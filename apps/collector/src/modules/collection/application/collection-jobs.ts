import type { CollectionOutcome, OperatingDay } from '@transcendence/core';

import type { VehiclePosition } from './transit-data-source';

export type NewCollection = {
  lineVariantId: string;
  operatingDay: OperatingDay;
  intervalSecs: number;
  firstPollAt: Date;
};

export type ScheduledCollection = { jobId: string; created: boolean };

export type DueCollection = { jobId: string; sourceId: number };

export type AttemptRecord = {
  jobId: string;
  requestedAt: Date;
  outcome: CollectionOutcome;
  httpStatus?: number;
  latencyMs: number;
  referenceClock?: string;
  raw?: string;
  positions: VehiclePosition[];
};

export interface CollectionJobs {
  schedule(collection: NewCollection): Promise<ScheduledCollection>;
  finishExpired(now: Date): Promise<number>;
  claimDue(now: Date, limit: number): Promise<DueCollection[]>;
  recordAttempt(attempt: AttemptRecord): Promise<void>;
}

export const COLLECTION_JOBS = Symbol('COLLECTION_JOBS');
