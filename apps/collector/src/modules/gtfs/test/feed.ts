import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GTFS_FILES, type GtfsFiles } from '../domain/schedule';

/**
 * Loads the GTFS excerpt kept in the repository fixtures folder.
 */
export function fixtureFeed(): GtfsFiles {
  const directory = join(process.cwd(), '..', '..', 'fixtures', 'gtfs');
  return Object.fromEntries(
    GTFS_FILES.map((file) => [file, readFileSync(join(directory, `${file}.txt`), 'utf8')]),
  ) as GtfsFiles;
}

/**
 * Builds a small valid feed with one route, two stops and one trip, which tests then break on purpose.
 */
export function smallFeed(): GtfsFiles {
  return {
    routes:
      'route_id,route_short_name,route_long_name,route_type\n8000-10,8000-10,Term. Lapa - Pça. Ramos,3\n',
    calendar:
      'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nUSD,1,1,1,1,1,1,1,20231001,20270601\n',
    stops: 'stop_id,stop_name,stop_lat,stop_lon\n1,A,-23.5,-46.6\n2,B,-23.6,-46.7\n',
    trips: 'route_id,service_id,trip_id,trip_headsign,direction_id\n8000-10,USD,8000-10-0,Lapa,0\n',
    stop_times:
      'trip_id,arrival_time,departure_time,stop_id,stop_sequence\n8000-10-0,23:50:00,23:50:00,1,1\n8000-10-0,24:05:30,24:05:30,2,2\n',
    frequencies: 'trip_id,start_time,end_time,headway_secs\n8000-10-0,04:00:00,04:59:00,600\n',
  };
}
