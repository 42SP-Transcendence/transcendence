import type { PrismaClient } from '@transcendence/database';

import type { FeedVersion, ScheduleRepository, StoredSchedule } from '../application/ports';
import { routeDistricts } from '../domain/route-districts';
import type { Schedule } from '../domain/schedule';

const CHUNK_SIZE = 5_000;

/**
 * Splits a list into consecutive slices of at most CHUNK_SIZE items.
 */
function chunks<T>(items: T[]): T[][] {
  const slices: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    slices.push(items.slice(i, i + CHUNK_SIZE));
  }
  return slices;
}

export class PrismaScheduleRepository implements ScheduleRepository {
  /**
   * Receives the shared Prisma client.
   */
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Replaces the whole schedule, recalculates route_districts from the new stops and records the feed version in one transaction, so readers never see half a feed.
   */
  async replace(schedule: Schedule, version: FeedVersion): Promise<StoredSchedule> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.route.deleteMany();
        await tx.calendar.deleteMany();
        await tx.stop.deleteMany();
        for (const data of chunks(schedule.routes)) {
          await tx.route.createMany({ data });
        }
        for (const data of chunks(schedule.calendars)) {
          await tx.calendar.createMany({ data });
        }
        for (const data of chunks(schedule.stops)) {
          await tx.stop.createMany({ data });
        }
        for (const data of chunks(schedule.trips)) {
          await tx.trip.createMany({ data });
        }
        for (const data of chunks(schedule.stopTimes)) {
          await tx.stopTime.createMany({ data });
        }
        for (const data of chunks(schedule.frequencies)) {
          await tx.frequency.createMany({ data });
        }
        const districts = await tx.district.findMany({ select: { id: true, geometry: true } });
        const links = routeDistricts(schedule, districts);
        for (const data of chunks(links)) {
          await tx.routeDistrict.createMany({ data });
        }
        const feed = await tx.gtfsFeed.upsert({
          where: { contentHash: version.contentHash },
          create: version,
          update: { importedAt: new Date() },
        });
        const outlined = districts.filter((district) => district.geometry !== null).length;
        return { feedId: feed.id, districts: outlined, routeDistricts: links.length };
      },
      { maxWait: 15_000, timeout: 600_000 },
    );
  }
}
