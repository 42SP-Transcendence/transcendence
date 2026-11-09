import { parseCsv } from './csv';

export const GTFS_FILES = [
  'calendar',
  'frequencies',
  'routes',
  'stop_times',
  'stops',
  'trips',
] as const;

export type GtfsFile = (typeof GTFS_FILES)[number];

export type GtfsFiles = Record<GtfsFile, string>;

export type GtfsIssue = { file: GtfsFile; line: number; message: string };

type ScheduleRoute = {
  routeId: string;
  shortName: string;
  longName: string;
  routeType: number;
};

export type ScheduleCalendar = {
  serviceId: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  startDate: Date;
  endDate: Date;
};

type ScheduleStop = { stopId: bigint; name: string; lat: number; lon: number };

type ScheduleTrip = {
  tripId: string;
  routeId: string;
  serviceId: string;
  directionId: number;
  headsign: string | null;
};

type ScheduleStopTime = {
  tripId: string;
  stopSequence: number;
  stopId: bigint;
  arrivalOffsetSecs: number;
};

type ScheduleFrequency = {
  tripId: string;
  startSecs: number;
  endSecs: number;
  headwaySecs: number;
};

export type Schedule = {
  routes: ScheduleRoute[];
  calendars: ScheduleCalendar[];
  stops: ScheduleStop[];
  trips: ScheduleTrip[];
  stopTimes: ScheduleStopTime[];
  frequencies: ScheduleFrequency[];
};

export type ScheduleParseResult = {
  schedule: Schedule;
  rowCounts: Record<GtfsFile, number>;
  issues: GtfsIssue[];
  usable: boolean;
};

export type FeedValidity = { validFrom: Date; validTo: Date };

type Row = { line: number; get: (column: string) => string };

const REQUIRED_COLUMNS: Record<GtfsFile, readonly string[]> = {
  calendar: [
    'service_id',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'start_date',
    'end_date',
  ],
  frequencies: ['trip_id', 'start_time', 'end_time', 'headway_secs'],
  routes: ['route_id', 'route_short_name', 'route_long_name', 'route_type'],
  stop_times: ['trip_id', 'arrival_time', 'stop_id', 'stop_sequence'],
  stops: ['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
  trips: ['route_id', 'service_id', 'trip_id', 'direction_id'],
};

/**
 * Accepts any non-empty text.
 */
function nonEmpty(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/**
 * Parses a whole number and keeps it only inside the given range.
 */
function integerBetween(min: number, max: number): (value: string) => number | undefined {
  return (value) => {
    if (!/^-?\d+$/.test(value)) {
      return undefined;
    }
    const parsed = Number(value);
    return parsed >= min && parsed <= max ? parsed : undefined;
  };
}

/**
 * Parses a decimal number and keeps it only inside the given range.
 */
function decimalBetween(min: number, max: number): (value: string) => number | undefined {
  return (value) => {
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      return undefined;
    }
    const parsed = Number(value);
    return parsed >= min && parsed <= max ? parsed : undefined;
  };
}

/**
 * Parses a GTFS time such as 25:10:00 into seconds since midnight of the service day.
 */
function time(value: string): number | undefined {
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value);
  if (!match) {
    return undefined;
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/**
 * Parses a GTFS date such as 20231001 into a Date at midnight UTC, rejecting impossible dates.
 */
function date(value: string): Date | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
    ? parsed
    : undefined;
}

/**
 * Parses a numeric stop id, which the Olho Vivo API also uses as the stop code.
 */
function stopId(value: string): bigint | undefined {
  return /^\d+$/.test(value) ? BigInt(value) : undefined;
}

/**
 * Parses a 0 or 1 flag into a boolean.
 */
function flag(value: string): boolean | undefined {
  if (value === '1') {
    return true;
  }
  return value === '0' ? false : undefined;
}

/**
 * Reads one column through a parser and records an error when the value is empty or invalid.
 */
function field<T>(
  row: Row,
  column: string,
  parse: (value: string) => T | undefined,
  errors: string[],
): T {
  const value = row.get(column);
  const parsed = parse(value);
  if (parsed === undefined) {
    errors.push(value === '' ? `${column} is empty` : `invalid ${column} "${value}"`);
  }
  return parsed as T;
}

/**
 * Reads a column that must point to a record already accepted from another file.
 */
function reference(row: Row, column: string, known: Set<string>, errors: string[]): string {
  const value = row.get(column);
  if (!known.has(value)) {
    errors.push(`unknown ${column} "${value}"`);
  }
  return value;
}

/**
 * Reads a stop id that must belong to a stop already accepted from stops.txt.
 */
function existingStop(row: Row, known: Set<string>, errors: string[]): bigint {
  const parsed = field(row, 'stop_id', stopId, errors);
  if (parsed !== undefined && !known.has(String(parsed))) {
    errors.push(`unknown stop_id "${row.get('stop_id')}"`);
  }
  return parsed;
}

/**
 * Splits a GTFS file into rows keyed by column, or returns undefined when a required column is missing.
 */
function readTable(file: GtfsFile, text: string, issues: GtfsIssue[]): Row[] | undefined {
  const [header = [], ...records] = parseCsv(text);
  const index = new Map(header.map((column, i) => [column.trim(), i]));
  const missing = REQUIRED_COLUMNS[file].filter((column) => !index.has(column));
  if (missing.length > 0) {
    issues.push({ file, line: 1, message: `missing columns: ${missing.join(', ')}` });
    return undefined;
  }
  return records.map((values, i) => ({
    line: i + 2,
    get: (column) => (values[index.get(column) ?? -1] ?? '').trim(),
  }));
}

/**
 * Builds a record from each row, skipping and reporting rows with invalid fields or a repeated key.
 */
function collect<T>(
  file: GtfsFile,
  rows: Row[],
  issues: GtfsIssue[],
  build: (row: Row, errors: string[]) => T,
  key: (record: T) => string,
): T[] {
  const records: T[] = [];
  const keys = new Set<string>();
  for (const row of rows) {
    const errors: string[] = [];
    const record = build(row, errors);
    if (errors.length === 0 && keys.has(key(record))) {
      errors.push(`duplicate key ${key(record)}`);
    }
    if (errors.length > 0) {
      issues.push({ file, line: row.line, message: errors.join('; ') });
      continue;
    }
    keys.add(key(record));
    records.push(record);
  }
  return records;
}

/**
 * Returns an empty schedule, used when the feed cannot be read at all.
 */
function emptySchedule(): Schedule {
  return { routes: [], calendars: [], stops: [], trips: [], stopTimes: [], frequencies: [] };
}

/**
 * Validates a GTFS feed and turns it into schedule records, reporting every row it had to skip.
 */
export function parseSchedule(files: Partial<GtfsFiles>): ScheduleParseResult {
  const issues: GtfsIssue[] = [];
  const rowCounts = Object.fromEntries(GTFS_FILES.map((file) => [file, 0])) as Record<
    GtfsFile,
    number
  >;
  const tables = {} as Record<GtfsFile, Row[]>;
  for (const file of GTFS_FILES) {
    const text = files[file];
    if (text === undefined) {
      issues.push({ file, line: 0, message: 'file is missing' });
      continue;
    }
    const rows = readTable(file, text, issues);
    if (rows) {
      tables[file] = rows;
      rowCounts[file] = rows.length;
    }
  }
  if (GTFS_FILES.some((file) => tables[file] === undefined)) {
    return { schedule: emptySchedule(), rowCounts, issues, usable: false };
  }

  const routes = collect(
    'routes',
    tables.routes,
    issues,
    (row, errors) => ({
      routeId: field(row, 'route_id', nonEmpty, errors),
      shortName: row.get('route_short_name'),
      longName: row.get('route_long_name'),
      routeType: field(row, 'route_type', integerBetween(0, 9999), errors),
    }),
    (route) => route.routeId,
  );
  const calendars = collect(
    'calendar',
    tables.calendar,
    issues,
    (row, errors) => {
      const calendar = {
        serviceId: field(row, 'service_id', nonEmpty, errors),
        monday: field(row, 'monday', flag, errors),
        tuesday: field(row, 'tuesday', flag, errors),
        wednesday: field(row, 'wednesday', flag, errors),
        thursday: field(row, 'thursday', flag, errors),
        friday: field(row, 'friday', flag, errors),
        saturday: field(row, 'saturday', flag, errors),
        sunday: field(row, 'sunday', flag, errors),
        startDate: field(row, 'start_date', date, errors),
        endDate: field(row, 'end_date', date, errors),
      };
      if (calendar.startDate && calendar.endDate && calendar.startDate > calendar.endDate) {
        errors.push('start_date is after end_date');
      }
      return calendar;
    },
    (calendar) => calendar.serviceId,
  );
  const stops = collect(
    'stops',
    tables.stops,
    issues,
    (row, errors) => ({
      stopId: field(row, 'stop_id', stopId, errors),
      name: row.get('stop_name'),
      lat: field(row, 'stop_lat', decimalBetween(-90, 90), errors),
      lon: field(row, 'stop_lon', decimalBetween(-180, 180), errors),
    }),
    (stop) => String(stop.stopId),
  );
  const routeIds = new Set(routes.map((route) => route.routeId));
  const serviceIds = new Set(calendars.map((calendar) => calendar.serviceId));
  const trips = collect(
    'trips',
    tables.trips,
    issues,
    (row, errors) => ({
      tripId: field(row, 'trip_id', nonEmpty, errors),
      routeId: reference(row, 'route_id', routeIds, errors),
      serviceId: reference(row, 'service_id', serviceIds, errors),
      directionId: field(row, 'direction_id', integerBetween(0, 1), errors),
      headsign: row.get('trip_headsign') || null,
    }),
    (trip) => trip.tripId,
  );
  const tripIds = new Set(trips.map((trip) => trip.tripId));
  const stopIds = new Set(stops.map((stop) => String(stop.stopId)));
  const arrivals = collect(
    'stop_times',
    tables.stop_times,
    issues,
    (row, errors) => ({
      tripId: reference(row, 'trip_id', tripIds, errors),
      stopSequence: field(row, 'stop_sequence', integerBetween(0, 1_000_000), errors),
      stopId: existingStop(row, stopIds, errors),
      arrivalSecs: field(row, 'arrival_time', time, errors),
    }),
    (stopTime) => `${stopTime.tripId}#${stopTime.stopSequence}`,
  );
  const firstArrival = new Map<string, number>();
  for (const arrival of arrivals) {
    firstArrival.set(
      arrival.tripId,
      Math.min(firstArrival.get(arrival.tripId) ?? arrival.arrivalSecs, arrival.arrivalSecs),
    );
  }
  const stopTimes = arrivals.map((arrival) => ({
    tripId: arrival.tripId,
    stopSequence: arrival.stopSequence,
    stopId: arrival.stopId,
    arrivalOffsetSecs: arrival.arrivalSecs - (firstArrival.get(arrival.tripId) ?? 0),
  }));
  const frequencies = collect(
    'frequencies',
    tables.frequencies,
    issues,
    (row, errors) => {
      const frequency = {
        tripId: reference(row, 'trip_id', tripIds, errors),
        startSecs: field(row, 'start_time', time, errors),
        endSecs: field(row, 'end_time', time, errors),
        headwaySecs: field(row, 'headway_secs', integerBetween(1, 86_400), errors),
      };
      if (
        frequency.startSecs !== undefined &&
        frequency.endSecs !== undefined &&
        frequency.startSecs >= frequency.endSecs
      ) {
        errors.push('start_time is not before end_time');
      }
      return frequency;
    },
    (frequency) => `${frequency.tripId}#${frequency.startSecs}`,
  );

  const schedule = { routes, calendars, stops, trips, stopTimes, frequencies };
  const usable = routes.length > 0 && calendars.length > 0 && trips.length > 0;
  return { schedule, rowCounts, issues, usable };
}

/**
 * Returns the period the feed covers, from the earliest calendar start to the latest calendar end.
 */
export function feedValidity(calendars: ScheduleCalendar[]): FeedValidity | undefined {
  if (calendars.length === 0) {
    return undefined;
  }
  return {
    validFrom: new Date(Math.min(...calendars.map((calendar) => calendar.startDate.getTime()))),
    validTo: new Date(Math.max(...calendars.map((calendar) => calendar.endDate.getTime()))),
  };
}
