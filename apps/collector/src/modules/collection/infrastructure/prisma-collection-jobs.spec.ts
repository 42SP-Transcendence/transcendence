import { OperatingDay } from '@transcendence/core';
import type { PrismaClient } from '@transcendence/database';

import { PrismaCollectionJobs } from './prisma-collection-jobs';

const day = OperatingDay.parse('2026-11-18');
const newCollection = {
  lineVariantId: 'variant-1',
  operatingDay: day,
  intervalSecs: 30,
  firstPollAt: new Date('2026-11-18T15:00:00Z'),
};

/**
 * Builds a repository over a Prisma double for collection jobs.
 */
function withJobs(create: () => Promise<unknown>, existingId = 'existing-job') {
  const lookups: unknown[] = [];
  const prisma = {
    collectionJob: {
      create,
      findUniqueOrThrow: (args: unknown) => {
        lookups.push(args);
        return Promise.resolve({ id: existingId });
      },
    },
  };
  return { repository: new PrismaCollectionJobs(prisma as unknown as PrismaClient), lookups };
}

/**
 * Builds a repository over a Prisma double whose transaction records partition calls and inserted positions.
 */
function withTransaction() {
  const partitionDays: unknown[] = [];
  const inserted: unknown[] = [];
  const attempts: unknown[] = [];
  const tx = {
    collectionAttempt: {
      create: (args: unknown) => {
        attempts.push(args);
        return Promise.resolve({ id: 7n });
      },
    },
    $queryRaw: (_strings: TemplateStringsArray, ...values: unknown[]) => {
      partitionDays.push(values[0]);
      return Promise.resolve([]);
    },
    vehiclePosition: {
      createMany: (args: unknown) => {
        inserted.push(args);
        return Promise.resolve({ count: 0 });
      },
    },
  };
  const prisma = { $transaction: (work: (client: typeof tx) => Promise<void>) => work(tx) };
  return {
    repository: new PrismaCollectionJobs(prisma as unknown as PrismaClient),
    partitionDays,
    inserted,
    attempts,
  };
}

describe('PrismaCollectionJobs', () => {
  it('creates the job of a line direction and day with its first poll', async () => {
    let data: unknown;
    const { repository } = withJobs((args?: unknown) => {
      data = args;
      return Promise.resolve({ id: 'new-job' });
    });

    await expect(repository.schedule(newCollection)).resolves.toEqual({
      jobId: 'new-job',
      created: true,
    });
    expect(data).toMatchObject({
      data: {
        lineVariantId: 'variant-1',
        operatingDay: new Date('2026-11-18T00:00:00Z'),
        intervalSecs: 30,
        nextPollAt: newCollection.firstPollAt,
      },
    });
  });

  it('returns the existing job when the unique key already exists', async () => {
    const { repository, lookups } = withJobs(() => Promise.reject({ code: 'P2002' }));

    await expect(repository.schedule(newCollection)).resolves.toEqual({
      jobId: 'existing-job',
      created: false,
    });
    expect(lookups).toEqual([
      {
        where: {
          lineVariantId_operatingDay: {
            lineVariantId: 'variant-1',
            operatingDay: new Date('2026-11-18T00:00:00Z'),
          },
        },
        select: { id: true },
      },
    ]);
  });

  it('does not hide other database errors', async () => {
    const { repository } = withJobs(() => Promise.reject(new Error('connection lost')));

    await expect(repository.schedule(newCollection)).rejects.toThrow('connection lost');
  });

  it('ensures the partition of every São Paulo day in the batch before inserting positions', async () => {
    const { repository, partitionDays, inserted, attempts } = withTransaction();

    await repository.recordAttempt({
      jobId: 'job-1',
      requestedAt: new Date('2026-11-19T03:00:10Z'),
      outcome: 'ok',
      httpStatus: 200,
      latencyMs: 90,
      referenceClock: '00:00',
      raw: '{"hr":"00:00"}',
      positions: [
        {
          vehiclePrefix: '1',
          observedAt: new Date('2026-11-19T02:59:50Z'),
          lat: 0,
          lon: 0,
          accessible: true,
        },
        {
          vehiclePrefix: '2',
          observedAt: new Date('2026-11-19T03:00:05Z'),
          lat: 0,
          lon: 0,
          accessible: false,
        },
      ],
    });

    expect(partitionDays).toEqual(['2026-11-18', '2026-11-19']);
    expect(attempts).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({ vehicleCount: 2, rawResponse: { hr: '00:00' } }),
      }),
    ]);
    expect(inserted).toEqual([
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({ attemptId: 7n, vehiclePrefix: '1' }),
          expect.objectContaining({ attemptId: 7n, vehiclePrefix: '2' }),
        ],
      }),
    ]);
  });

  it('records a failed attempt without touching positions', async () => {
    const { repository, partitionDays, inserted, attempts } = withTransaction();

    await repository.recordAttempt({
      jobId: 'job-1',
      requestedAt: new Date('2026-11-18T15:00:00Z'),
      outcome: 'collector_failed',
      httpStatus: 503,
      latencyMs: 4000,
      positions: [],
    });

    expect(attempts).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: 'collector_failed',
          httpStatus: 503,
          vehicleCount: 0,
        }),
      }),
    ]);
    expect(partitionDays).toEqual([]);
    expect(inserted).toEqual([]);
  });
});
