import { feedContentHash } from '../domain/feed-version';
import {
  feedValidity,
  GTFS_FILES,
  type GtfsFile,
  type GtfsFiles,
  type GtfsIssue,
  parseSchedule,
  type Schedule,
} from '../domain/schedule';
import type { FeedVersion, GtfsSource, ScheduleRepository } from './ports';

type FileReport = { rows: number; imported: number };

export type ImportReport = {
  status: 'imported' | 'rejected';
  feedId?: number;
  version?: FeedVersion;
  files: Record<GtfsFile, FileReport>;
  issues: GtfsIssue[];
};

const IMPORTED_RECORDS: Record<GtfsFile, (schedule: Schedule) => number> = {
  calendar: (schedule) => schedule.calendars.length,
  frequencies: (schedule) => schedule.frequencies.length,
  routes: (schedule) => schedule.routes.length,
  stop_times: (schedule) => schedule.stopTimes.length,
  stops: (schedule) => schedule.stops.length,
  trips: (schedule) => schedule.trips.length,
};

export class ImportGtfs {
  /**
   * Receives the repository that stores the schedule and its feed version.
   */
  constructor(private readonly schedules: ScheduleRepository) {}

  /**
   * Reads, validates and stores one GTFS feed, replacing the current schedule only when the feed is usable.
   */
  async execute(source: GtfsSource): Promise<ImportReport> {
    const contents = await Promise.all(GTFS_FILES.map((file) => source.read(file)));
    const files: Partial<GtfsFiles> = {};
    GTFS_FILES.forEach((file, i) => {
      const content = contents[i];
      if (content !== undefined) {
        files[file] = content;
      }
    });
    const { schedule, rowCounts, issues, usable } = parseSchedule(files);
    const report = Object.fromEntries(
      GTFS_FILES.map((file) => [
        file,
        { rows: rowCounts[file], imported: usable ? IMPORTED_RECORDS[file](schedule) : 0 },
      ]),
    ) as Record<GtfsFile, FileReport>;
    const validity = feedValidity(schedule.calendars);
    if (!usable || !validity) {
      return { status: 'rejected', files: report, issues };
    }
    const version = { contentHash: feedContentHash(files as GtfsFiles), ...validity };
    const feedId = await this.schedules.replace(schedule, version);
    return { status: 'imported', feedId, version, files: report, issues };
  }
}
