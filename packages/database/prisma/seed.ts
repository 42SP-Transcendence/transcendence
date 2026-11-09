import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createPrismaClient } from '../src/index.js';

type Row = Record<string, string>;

type OlhoVivoLine = {
  cl: number;
  lt: string;
  tl: number;
  sl: number;
  tp: string;
  ts: string;
};

const fixtures = join(import.meta.dirname, '..', '..', '..', 'fixtures');

const gtfsFiles = ['calendar', 'frequencies', 'routes', 'stop_times', 'stops', 'trips'];

/**
 * Splits one CSV line into fields, honouring double-quoted fields that contain commas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * Reads a GTFS file from the fixtures folder as a list of rows keyed by column name.
 */
function readGtfs(name: string): Row[] {
  const [header, ...lines] = readFileSync(join(fixtures, 'gtfs', `${name}.txt`), 'utf8')
    .trim()
    .split('\n');
  const columns = parseCsvLine(header ?? '');
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, i) => [column, values[i] ?? '']));
  });
}

/**
 * Returns a column value, failing loudly when the fixture does not have it.
 */
function field(row: Row, column: string): string {
  const value = row[column];
  if (value === undefined) {
    throw new Error(`Missing GTFS column ${column}`);
  }
  return value;
}

/**
 * Converts a GTFS time such as 25:10:00 into seconds since midnight of the service day.
 */
function toSeconds(time: string): number {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Converts a GTFS date such as 20231001 into a Date at midnight UTC.
 */
function toDate(value: string): Date {
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`);
}

/**
 * Hashes the imported GTFS files so the same content always maps to the same feed version.
 */
function gtfsContentHash(): string {
  const hash = createHash('sha256');
  for (const name of gtfsFiles) {
    hash.update(`${name}\n`);
    hash.update(readFileSync(join(fixtures, 'gtfs', `${name}.txt`)));
  }
  return hash.digest('hex');
}

/**
 * Builds stop_times rows with each arrival stored as an offset from the trip's first arrival.
 */
function stopTimesWithOffsets(rows: Row[]) {
  const firstArrival = new Map<string, number>();
  for (const row of rows) {
    const tripId = field(row, 'trip_id');
    const arrival = toSeconds(field(row, 'arrival_time'));
    firstArrival.set(tripId, Math.min(firstArrival.get(tripId) ?? arrival, arrival));
  }
  return rows.map((row) => {
    const tripId = field(row, 'trip_id');
    return {
      tripId,
      stopSequence: Number(field(row, 'stop_sequence')),
      stopId: BigInt(field(row, 'stop_id')),
      arrivalOffsetSecs: toSeconds(field(row, 'arrival_time')) - (firstArrival.get(tripId) ?? 0),
    };
  });
}

/**
 * Replaces the schedule with the GTFS excerpt, records its feed version and upserts the matching Olho Vivo line variants.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  const prisma = createPrismaClient(url);
  const lines = JSON.parse(
    readFileSync(join(fixtures, 'olho-vivo', 'linha-buscar-8000.json'), 'utf8'),
  ) as OlhoVivoLine[];
  const calendars = readGtfs('calendar').map((row) => ({
    serviceId: field(row, 'service_id'),
    monday: field(row, 'monday') === '1',
    tuesday: field(row, 'tuesday') === '1',
    wednesday: field(row, 'wednesday') === '1',
    thursday: field(row, 'thursday') === '1',
    friday: field(row, 'friday') === '1',
    saturday: field(row, 'saturday') === '1',
    sunday: field(row, 'sunday') === '1',
    startDate: toDate(field(row, 'start_date')),
    endDate: toDate(field(row, 'end_date')),
  }));
  const feed = {
    contentHash: gtfsContentHash(),
    validFrom: new Date(Math.min(...calendars.map((calendar) => calendar.startDate.getTime()))),
    validTo: new Date(Math.max(...calendars.map((calendar) => calendar.endDate.getTime()))),
  };
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.route.deleteMany();
        await tx.calendar.deleteMany();
        await tx.stop.deleteMany();
        await tx.route.createMany({
          data: readGtfs('routes').map((row) => ({
            routeId: field(row, 'route_id'),
            shortName: field(row, 'route_short_name'),
            longName: field(row, 'route_long_name'),
            routeType: Number(field(row, 'route_type')),
          })),
        });
        await tx.calendar.createMany({ data: calendars });
        await tx.stop.createMany({
          data: readGtfs('stops').map((row) => ({
            stopId: BigInt(field(row, 'stop_id')),
            name: field(row, 'stop_name'),
            lat: Number(field(row, 'stop_lat')),
            lon: Number(field(row, 'stop_lon')),
          })),
        });
        await tx.trip.createMany({
          data: readGtfs('trips').map((row) => ({
            tripId: field(row, 'trip_id'),
            routeId: field(row, 'route_id'),
            serviceId: field(row, 'service_id'),
            directionId: Number(field(row, 'direction_id')),
            headsign: field(row, 'trip_headsign') || null,
          })),
        });
        await tx.stopTime.createMany({ data: stopTimesWithOffsets(readGtfs('stop_times')) });
        await tx.frequency.createMany({
          data: readGtfs('frequencies').map((row) => ({
            tripId: field(row, 'trip_id'),
            startSecs: toSeconds(field(row, 'start_time')),
            endSecs: toSeconds(field(row, 'end_time')),
            headwaySecs: Number(field(row, 'headway_secs')),
          })),
        });
        await tx.gtfsFeed.upsert({
          where: { contentHash: feed.contentHash },
          create: feed,
          update: {},
        });
        for (const line of lines) {
          const variant = {
            routeId: `${line.lt}-${line.tl}`,
            directionId: line.sl - 1,
            lt: line.lt,
            tl: line.tl,
            terminalMain: line.tp,
            terminalSecondary: line.ts,
          };
          await tx.lineVariant.upsert({
            where: { olhoVivoCl: line.cl },
            create: { olhoVivoCl: line.cl, ...variant },
            update: variant,
          });
        }
      },
      { maxWait: 15_000, timeout: 60_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
