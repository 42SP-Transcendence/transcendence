import type {
  AttemptRecord,
  CollectionJobs,
  DueCollection,
  NewCollection,
  ScheduledCollection,
} from '../application/collection-jobs';

export class FakeCollectionJobs implements CollectionJobs {
  readonly jobs = new Map<string, NewCollection & { jobId: string }>();
  readonly attempts: AttemptRecord[] = [];
  readonly claims: { now: Date; limit: number }[] = [];
  due: DueCollection[] = [];
  expired = 0;

  /**
   * Stores one job per line direction and day, returning the existing one for repeated requests.
   */
  schedule(collection: NewCollection): Promise<ScheduledCollection> {
    const key = `${collection.lineVariantId}|${collection.operatingDay.toString()}`;
    const existing = this.jobs.get(key);
    if (existing) {
      return Promise.resolve({ jobId: existing.jobId, created: false });
    }
    const jobId = `job-${this.jobs.size + 1}`;
    this.jobs.set(key, { ...collection, jobId });
    return Promise.resolve({ jobId, created: true });
  }

  /**
   * Returns the configured number of expired jobs.
   */
  finishExpired(): Promise<number> {
    return Promise.resolve(this.expired);
  }

  /**
   * Hands out up to limit of the configured due jobs and records the claim.
   */
  claimDue(now: Date, limit: number): Promise<DueCollection[]> {
    this.claims.push({ now, limit });
    return Promise.resolve(this.due.splice(0, limit));
  }

  /**
   * Keeps the attempt for inspection.
   */
  recordAttempt(attempt: AttemptRecord): Promise<void> {
    this.attempts.push(attempt);
    return Promise.resolve();
  }
}
