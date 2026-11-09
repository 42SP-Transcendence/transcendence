import type { GtfsFile, GtfsFiles, Schedule } from '../domain/schedule';
import { smallFeed } from '../test/feed';
import { ImportGtfs } from './import-gtfs.use-case';
import type { FeedVersion, GtfsSource, ScheduleRepository } from './ports';

class FakeSource implements GtfsSource {
  /**
   * Receives the files this fake source serves.
   */
  constructor(private readonly files: Partial<GtfsFiles>) {}

  /**
   * Returns the file content, or undefined when the fake does not have it.
   */
  async read(file: GtfsFile): Promise<string | undefined> {
    return this.files[file];
  }
}

class FakeScheduleRepository implements ScheduleRepository {
  readonly replaced: { schedule: Schedule; version: FeedVersion }[] = [];

  /**
   * Records the call and returns a fixed feed id.
   */
  async replace(schedule: Schedule, version: FeedVersion): Promise<number> {
    this.replaced.push({ schedule, version });
    return 7;
  }
}

describe('ImportGtfs', () => {
  it('stores a usable feed with its version and reports rows per file', async () => {
    const repository = new FakeScheduleRepository();

    const report = await new ImportGtfs(repository).execute(new FakeSource(smallFeed()));

    expect(report).toMatchObject({
      status: 'imported',
      feedId: 7,
      version: {
        contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        validFrom: new Date('2023-10-01T00:00:00Z'),
        validTo: new Date('2027-06-01T00:00:00Z'),
      },
      files: { stop_times: { rows: 2, imported: 2 }, routes: { rows: 1, imported: 1 } },
      issues: [],
    });
    expect(repository.replaced).toHaveLength(1);
    expect(repository.replaced[0]?.schedule.trips).toHaveLength(1);
  });

  it('imports the valid rows and reports the skipped ones', async () => {
    const feed = smallFeed();
    feed.stop_times += '8000-10-0,25:00:00,25:00:00,99,3\n';
    const repository = new FakeScheduleRepository();

    const report = await new ImportGtfs(repository).execute(new FakeSource(feed));

    expect(report.status).toBe('imported');
    expect(report.files.stop_times).toEqual({ rows: 3, imported: 2 });
    expect(report.issues).toEqual([
      { file: 'stop_times', line: 4, message: 'unknown stop_id "99"' },
    ]);
  });

  it('leaves the current schedule untouched when the feed is rejected', async () => {
    const feed: Partial<GtfsFiles> = smallFeed();
    delete feed.trips;
    const repository = new FakeScheduleRepository();

    const report = await new ImportGtfs(repository).execute(new FakeSource(feed));

    expect(report.status).toBe('rejected');
    expect(report.files.routes).toEqual({ rows: 1, imported: 0 });
    expect(report.issues).toEqual([{ file: 'trips', line: 0, message: 'file is missing' }]);
    expect(repository.replaced).toEqual([]);
  });
});
