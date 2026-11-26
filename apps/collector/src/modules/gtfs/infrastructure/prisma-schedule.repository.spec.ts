import type { PrismaClient } from '@transcendence/database';

import { parseSchedule } from '../domain/schedule';
import { smallFeed } from '../test/feed';
import { PrismaScheduleRepository } from './prisma-schedule.repository';

const version = {
  contentHash: 'abc',
  validFrom: new Date('2023-10-01T00:00:00Z'),
  validTo: new Date('2027-06-01T00:00:00Z'),
};

/**
 * Returns a GeoJSON polygon covering a small square around a point.
 */
function around(lon: number, lat: number) {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon - 0.01, lat - 0.01],
        [lon + 0.01, lat - 0.01],
        [lon + 0.01, lat + 0.01],
        [lon - 0.01, lat + 0.01],
        [lon - 0.01, lat - 0.01],
      ],
    ],
  };
}

/**
 * Builds a repository over a Prisma double that keeps route_districts in memory and drops it when routes are deleted, like the cascade in the database.
 */
function withDatabase(districts: { id: number; geometry: unknown }[], routeDistricts: unknown[]) {
  const stored = { routeDistricts: [...routeDistricts] };
  const insert = () => Promise.resolve({ count: 0 });
  const tx = {
    route: {
      deleteMany: () => {
        stored.routeDistricts = [];
        return Promise.resolve({ count: 0 });
      },
      createMany: insert,
    },
    calendar: { deleteMany: insert, createMany: insert },
    stop: { deleteMany: insert, createMany: insert },
    trip: { createMany: insert },
    stopTime: { createMany: insert },
    frequency: { createMany: insert },
    district: { findMany: () => Promise.resolve(districts) },
    routeDistrict: {
      createMany: ({ data }: { data: unknown[] }) => {
        stored.routeDistricts.push(...data);
        return Promise.resolve({ count: data.length });
      },
    },
    gtfsFeed: { upsert: () => Promise.resolve({ id: 5 }) },
  };
  const prisma = { $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx) };
  return { repository: new PrismaScheduleRepository(prisma as unknown as PrismaClient), stored };
}

describe('PrismaScheduleRepository', () => {
  it('recalculates route_districts from the new feed instead of leaving it empty', async () => {
    const { schedule } = parseSchedule(smallFeed());
    const { repository, stored } = withDatabase(
      [
        { id: 1, geometry: around(-46.6, -23.5) },
        { id: 2, geometry: around(-46.7, -23.6) },
        { id: 3, geometry: around(-46.4, -23.7) },
      ],
      [{ routeId: 'old-route', districtId: 3 }],
    );

    await expect(repository.replace(schedule, version)).resolves.toEqual({
      feedId: 5,
      districts: 3,
      routeDistricts: 2,
    });
    expect(stored.routeDistricts).toEqual([
      { routeId: '8000-10', districtId: 1 },
      { routeId: '8000-10', districtId: 2 },
    ]);
  });

  it('keeps importing while no district has an outline', async () => {
    const { schedule } = parseSchedule(smallFeed());
    const { repository, stored } = withDatabase([{ id: 1, geometry: null }], []);

    await expect(repository.replace(schedule, version)).resolves.toEqual({
      feedId: 5,
      districts: 0,
      routeDistricts: 0,
    });
    expect(stored.routeDistricts).toEqual([]);
  });
});
