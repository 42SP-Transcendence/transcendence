import { OperatingDay } from '@transcendence/core';
import type { Prisma, PrismaClient } from '@transcendence/database';

import type {
  AttemptRecord,
  CollectionJobs,
  DueCollection,
  NewCollection,
  ScheduledCollection,
} from '../application/collection-jobs';

/**
 * Converts an operating day into the UTC-midnight Date that Prisma writes to a DATE column.
 */
function asDateColumn(day: OperatingDay): Date {
  return new Date(`${day.toString()}T00:00:00Z`);
}

/**
 * Tells whether Prisma refused a write because of a unique constraint.
 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

/**
 * Keeps the raw answer as JSON when it parses, or as text otherwise, so evidence is never lost.
 */
function rawJson(raw: string | undefined): Prisma.InputJsonValue | undefined {
  if (raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as Prisma.InputJsonValue;
  } catch {
    return { text: raw };
  }
}

export class PrismaCollectionJobs implements CollectionJobs {
  /**
   * Receives the shared Prisma client.
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Creates the job of a line direction and day, or returns the existing one; the unique key settles concurrent requests.
   */
  async schedule(collection: NewCollection): Promise<ScheduledCollection> {
    const key = {
      lineVariantId: collection.lineVariantId,
      operatingDay: asDateColumn(collection.operatingDay),
    };
    try {
      const job = await this.prisma.collectionJob.create({
        data: { ...key, intervalSecs: collection.intervalSecs, nextPollAt: collection.firstPollAt },
        select: { id: true },
      });
      return { jobId: job.id, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const job = await this.prisma.collectionJob.findUniqueOrThrow({
        where: { lineVariantId_operatingDay: key },
        select: { id: true },
      });
      return { jobId: job.id, created: false };
    }
  }

  /**
   * Marks as done every open job whose São Paulo day has ended.
   */
  async finishExpired(now: Date): Promise<number> {
    return this.prisma.$executeRaw`
      UPDATE collection_jobs
      SET status = 'done', finished_at = ${now}
      WHERE status IN ('pending', 'running')
        AND ((operating_day + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo') <= ${now}`;
  }

  /**
   * Reserves the due jobs with SKIP LOCKED and pushes their next poll one interval ahead, so no two collectors take the same job.
   */
  async claimDue(now: Date, limit: number): Promise<DueCollection[]> {
    return this.prisma.$queryRaw<DueCollection[]>`
      WITH due AS (
        SELECT id FROM collection_jobs
        WHERE status IN ('pending', 'running') AND next_poll_at <= ${now}
        ORDER BY next_poll_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      ), claimed AS (
        UPDATE collection_jobs AS job
        SET status = 'running',
            started_at = COALESCE(job.started_at, ${now}),
            next_poll_at = ${now}::timestamptz + make_interval(secs => job.interval_secs)
        FROM due
        WHERE job.id = due.id
        RETURNING job.id, job.line_variant_id
      )
      SELECT claimed.id AS "jobId", variant.olho_vivo_cl AS "sourceId"
      FROM claimed
      JOIN line_variants AS variant ON variant.id = claimed.line_variant_id`;
  }

  /**
   * Stores the attempt and its positions in one transaction, creating any missing daily partition first.
   */
  async recordAttempt(attempt: AttemptRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const { id } = await tx.collectionAttempt.create({
        data: {
          jobId: attempt.jobId,
          requestedAt: attempt.requestedAt,
          outcome: attempt.outcome,
          httpStatus: attempt.httpStatus ?? null,
          latencyMs: attempt.latencyMs,
          referenceHr: attempt.referenceClock ?? null,
          vehicleCount: attempt.positions.length,
          rawResponse: rawJson(attempt.raw),
        },
        select: { id: true },
      });
      if (attempt.positions.length === 0) {
        return;
      }
      const days = new Set(
        attempt.positions.map((position) =>
          OperatingDay.containing(position.observedAt).toString(),
        ),
      );
      for (const day of days) {
        await tx.$queryRaw`SELECT ensure_vehicle_positions_partition(${day}::date)`;
      }
      await tx.vehiclePosition.createMany({
        data: attempt.positions.map((position) => ({
          jobId: attempt.jobId,
          attemptId: id,
          vehiclePrefix: position.vehiclePrefix,
          observedAt: position.observedAt,
          lat: position.lat,
          lon: position.lon,
          accessible: position.accessible,
        })),
        skipDuplicates: true,
      });
    });
  }
}
