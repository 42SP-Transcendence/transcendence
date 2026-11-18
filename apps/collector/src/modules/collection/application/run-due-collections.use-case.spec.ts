import { FakeCollectionJobs } from '../test/fake-collection-jobs';
import { RunDueCollections } from './run-due-collections.use-case';
import {
  type PositionsSnapshot,
  type TransitDataSource,
  TransitDataSourceError,
  type VehiclePosition,
} from './transit-data-source';

const requestedAt = new Date('2026-11-18T15:00:00Z');

/**
 * Builds one bus position observed at the given instant.
 */
function bus(prefix: string, observedAt: string): VehiclePosition {
  return {
    vehiclePrefix: prefix,
    observedAt: new Date(observedAt),
    lat: -23.5,
    lon: -46.6,
    accessible: true,
  };
}

/**
 * Builds a data source whose answer for each source id comes from the given function.
 */
function sourceAnswering(
  answer: (sourceId: number) => Promise<PositionsSnapshot>,
): TransitDataSource {
  return { positions: answer, lineVariants: () => Promise.resolve([]) };
}

/**
 * Builds a snapshot with the given buses.
 */
function snapshot(vehicles: VehiclePosition[]): PositionsSnapshot {
  return { referenceClock: '12:00', vehicles, raw: '{"hr":"12:00","vs":[]}', latencyMs: 120 };
}

describe('RunDueCollections', () => {
  it('records an ok attempt with its positions, HTTP status, latency and raw answer', async () => {
    const jobs = new FakeCollectionJobs();
    jobs.due = [{ jobId: 'job-1', sourceId: 1234 }];
    const vehicles = [bus('11001', '2026-11-18T14:59:30Z')];

    const report = await new RunDueCollections(
      jobs,
      sourceAnswering(() => Promise.resolve(snapshot(vehicles))),
      () => requestedAt,
    ).execute(requestedAt);

    expect(report.polled).toEqual([{ jobId: 'job-1', outcome: 'ok' }]);
    expect(jobs.attempts).toEqual([
      {
        jobId: 'job-1',
        requestedAt,
        outcome: 'ok',
        httpStatus: 200,
        latencyMs: 120,
        referenceClock: '12:00',
        raw: '{"hr":"12:00","vs":[]}',
        positions: vehicles,
      },
    ]);
  });

  it('classifies an answer without buses as empty and an old one as stale', async () => {
    const jobs = new FakeCollectionJobs();
    jobs.due = [
      { jobId: 'job-1', sourceId: 1 },
      { jobId: 'job-2', sourceId: 2 },
    ];
    const answers: Record<number, PositionsSnapshot> = {
      1: snapshot([]),
      2: snapshot([bus('11002', '2026-11-18T14:50:00Z')]),
    };

    const report = await new RunDueCollections(
      jobs,
      sourceAnswering((id) => Promise.resolve(answers[id] as PositionsSnapshot)),
      () => requestedAt,
    ).execute(requestedAt);

    expect(report.polled).toEqual([
      { jobId: 'job-1', outcome: 'empty' },
      { jobId: 'job-2', outcome: 'stale' },
    ]);
  });

  it('records failures with the outcome and HTTP status from the data source', async () => {
    const jobs = new FakeCollectionJobs();
    jobs.due = [
      { jobId: 'job-1', sourceId: 1 },
      { jobId: 'job-2', sourceId: 2 },
      { jobId: 'job-3', sourceId: 3 },
    ];
    const errors: Record<number, Error> = {
      1: new TransitDataSourceError('auth_failed', 'token refused'),
      2: new TransitDataSourceError('collector_failed', 'HTTP 503', 503),
      3: new Error('unexpected'),
    };

    await new RunDueCollections(
      jobs,
      sourceAnswering((id) => Promise.reject(errors[id])),
      () => requestedAt,
    ).execute(requestedAt);

    expect(
      jobs.attempts.map(({ outcome, httpStatus, positions }) => ({
        outcome,
        httpStatus,
        positions,
      })),
    ).toEqual([
      { outcome: 'auth_failed', httpStatus: undefined, positions: [] },
      { outcome: 'collector_failed', httpStatus: 503, positions: [] },
      { outcome: 'collector_failed', httpStatus: undefined, positions: [] },
    ]);
  });

  it('never polls more than five collections at the same time across overlapping ticks', async () => {
    const jobs = new FakeCollectionJobs();
    jobs.due = Array.from({ length: 8 }, (_, i) => ({ jobId: `job-${i}`, sourceId: i }));
    const pending: (() => void)[] = [];
    const run = new RunDueCollections(
      jobs,
      sourceAnswering(
        () =>
          new Promise((resolve) => {
            pending.push(() => resolve(snapshot([])));
          }),
      ),
      () => requestedAt,
    );

    const firstTick = run.execute(requestedAt);
    await new Promise((resolve) => setImmediate(resolve));
    const secondTick = await run.execute(requestedAt);

    expect(jobs.claims.map(({ limit }) => limit)).toEqual([5]);
    expect(secondTick.polled).toEqual([]);
    pending.splice(0).forEach((release) => release());
    expect((await firstTick).polled).toHaveLength(5);

    const thirdTick = run.execute(requestedAt);
    await new Promise((resolve) => setImmediate(resolve));
    expect(jobs.claims.map(({ limit }) => limit)).toEqual([5, 5]);
    pending.splice(0).forEach((release) => release());
    expect((await thirdTick).polled).toHaveLength(3);
  });

  it('reports how many collections it closed because their day ended', async () => {
    const jobs = new FakeCollectionJobs();
    jobs.expired = 2;

    const report = await new RunDueCollections(
      jobs,
      sourceAnswering(() => Promise.resolve(snapshot([]))),
    ).execute(requestedAt);

    expect(report).toEqual({ finished: 2, polled: [] });
  });
});
