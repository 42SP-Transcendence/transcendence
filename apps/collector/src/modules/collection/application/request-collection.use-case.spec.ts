import { OperatingDay } from '@transcendence/core';

import { FakeCollectionJobs } from '../test/fake-collection-jobs';
import { CollectionDayOverError, RequestCollection } from './request-collection.use-case';

describe('RequestCollection', () => {
  const day = OperatingDay.parse('2026-11-18');
  const now = new Date('2026-11-18T15:00:00Z');

  it('turns two identical requests into a single collection', async () => {
    const jobs = new FakeCollectionJobs();
    const request = new RequestCollection(jobs);

    const first = await request.execute('variant-1', day, now);
    const second = await request.execute('variant-1', day, new Date('2026-11-18T15:05:00Z'));

    expect(first).toEqual({ jobId: 'job-1', created: true });
    expect(second).toEqual({ jobId: 'job-1', created: false });
    expect(jobs.jobs.size).toBe(1);
  });

  it('keeps directions and days apart', async () => {
    const jobs = new FakeCollectionJobs();
    const request = new RequestCollection(jobs);

    await request.execute('variant-1', day, now);
    await request.execute('variant-2', day, now);
    await request.execute('variant-1', day.next(), now);

    expect(jobs.jobs.size).toBe(3);
  });

  it('polls every 30 seconds starting right away during the day', async () => {
    const jobs = new FakeCollectionJobs();

    await new RequestCollection(jobs).execute('variant-1', day, now);

    expect([...jobs.jobs.values()][0]).toMatchObject({ intervalSecs: 30, firstPollAt: now });
  });

  it('refuses a day whose collection already ended', async () => {
    await expect(
      new RequestCollection(new FakeCollectionJobs()).execute(
        'variant-1',
        day,
        new Date('2026-11-19T03:00:01Z'),
      ),
    ).rejects.toBeInstanceOf(CollectionDayOverError);
  });
});
