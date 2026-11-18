import type { CollectionOutcome } from '@transcendence/core';

import { classifyPositions } from '../domain/attempt-outcome';
import type { AttemptRecord, CollectionJobs, DueCollection } from './collection-jobs';
import { type TransitDataSource, TransitDataSourceError } from './transit-data-source';

const MAX_CONCURRENT_POLLS = 5;

export type TickReport = {
  finished: number;
  polled: { jobId: string; outcome: CollectionOutcome }[];
};

export class RunDueCollections {
  private inFlight = 0;

  /**
   * Receives the job queue, the transit data source and the clock used to time each request.
   */
  constructor(
    private readonly jobs: CollectionJobs,
    private readonly source: TransitDataSource,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /**
   * Closes the collections whose day ended, then polls the due ones, never more than five at a time across overlapping ticks.
   */
  async execute(now: Date): Promise<TickReport> {
    const finished = await this.jobs.finishExpired(now);
    const free = MAX_CONCURRENT_POLLS - this.inFlight;
    if (free <= 0) {
      return { finished, polled: [] };
    }
    const due = await this.jobs.claimDue(now, free);
    this.inFlight += due.length;
    const polled = await Promise.all(
      due.map(async (job) => {
        try {
          return { jobId: job.jobId, outcome: await this.poll(job) };
        } finally {
          this.inFlight -= 1;
        }
      }),
    );
    return { finished, polled };
  }

  /**
   * Queries one collection, classifies the answer and records the attempt, failures included.
   */
  private async poll(job: DueCollection): Promise<CollectionOutcome> {
    const requestedAt = this.clock();
    let record: AttemptRecord;
    try {
      const snapshot = await this.source.positions(job.sourceId);
      record = {
        jobId: job.jobId,
        requestedAt,
        outcome: classifyPositions(
          snapshot.vehicles.map((vehicle) => vehicle.observedAt),
          requestedAt,
        ),
        httpStatus: 200,
        latencyMs: snapshot.latencyMs,
        referenceClock: snapshot.referenceClock,
        raw: snapshot.raw,
        positions: snapshot.vehicles,
      };
    } catch (error) {
      const failure = error instanceof TransitDataSourceError ? error : null;
      record = {
        jobId: job.jobId,
        requestedAt,
        outcome: failure?.outcome ?? 'collector_failed',
        httpStatus: failure?.httpStatus,
        latencyMs: this.clock().getTime() - requestedAt.getTime(),
        positions: [],
      };
    }
    await this.jobs.recordAttempt(record);
    return record.outcome;
  }
}
