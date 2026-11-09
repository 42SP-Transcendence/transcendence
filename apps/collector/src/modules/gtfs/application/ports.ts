import type { FeedValidity, GtfsFile, Schedule } from '../domain/schedule';

export type FeedVersion = FeedValidity & { contentHash: string };

export interface GtfsSource {
  read(file: GtfsFile): Promise<string | undefined>;
}

export interface ScheduleRepository {
  replace(schedule: Schedule, version: FeedVersion): Promise<number>;
}

export const SCHEDULE_REPOSITORY = Symbol('SCHEDULE_REPOSITORY');
