import { fixtureFeed, smallFeed } from '../test/feed';
import { feedValidity, parseSchedule } from './schedule';

describe('parseSchedule', () => {
  it('accepts the repository excerpt without issues', () => {
    const result = parseSchedule(fixtureFeed());

    expect(result.usable).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.schedule.routes.map((route) => route.routeId).sort()).toEqual([
      '7545-10',
      '8000-1',
      '8000-10',
    ]);
    expect(result.schedule.stopTimes).toHaveLength(result.rowCounts.stop_times);
    expect(result.schedule.frequencies).toHaveLength(result.rowCounts.frequencies);
  });

  it('stores arrivals as offsets from the first stop, past midnight included', () => {
    const { schedule } = parseSchedule(smallFeed());

    expect(schedule.stopTimes).toEqual([
      { tripId: '8000-10-0', stopSequence: 1, stopId: 1n, arrivalOffsetSecs: 0 },
      { tripId: '8000-10-0', stopSequence: 2, stopId: 2n, arrivalOffsetSecs: 930 },
    ]);
    expect(schedule.frequencies).toEqual([
      { tripId: '8000-10-0', startSecs: 14_400, endSecs: 17_940, headwaySecs: 600 },
    ]);
    expect(schedule.calendars[0]?.startDate).toEqual(new Date('2023-10-01T00:00:00Z'));
  });

  it('skips invalid rows and reports the line and the reason', () => {
    const feed = smallFeed();
    feed.routes += '8000-10,dup,dup,3\nX-1,X,X,bus\n';
    feed.stop_times +=
      '8000-10-0,7:61:00,7:61:00,2,3\n8000-10-0,25:00:00,25:00:00,99,4\nghost,01:00:00,01:00:00,1,1\n';
    feed.frequencies += '8000-10-0,06:00:00,05:00:00,600\n8000-10-0,07:00:00,07:59:00,0\n';
    feed.calendar += 'BAD,1,1,1,1,1,1,1,20270230,20270601\n';

    const result = parseSchedule(feed);

    expect(result.usable).toBe(true);
    expect(result.issues).toEqual([
      { file: 'routes', line: 3, message: 'duplicate key 8000-10' },
      { file: 'routes', line: 4, message: 'invalid route_type "bus"' },
      { file: 'calendar', line: 3, message: 'invalid start_date "20270230"' },
      { file: 'stop_times', line: 4, message: 'invalid arrival_time "7:61:00"' },
      { file: 'stop_times', line: 5, message: 'unknown stop_id "99"' },
      { file: 'stop_times', line: 6, message: 'unknown trip_id "ghost"' },
      { file: 'frequencies', line: 3, message: 'start_time is not before end_time' },
      { file: 'frequencies', line: 4, message: 'invalid headway_secs "0"' },
    ]);
    expect(result.schedule.routes).toHaveLength(1);
    expect(result.schedule.stopTimes).toHaveLength(2);
    expect(result.schedule.frequencies).toHaveLength(1);
  });

  it('skips trips whose route was rejected, and the stop times of those trips', () => {
    const feed = smallFeed();
    feed.trips += '9999-10,USD,9999-10-0,Nowhere,1\n';
    feed.stop_times += '9999-10-0,08:00:00,08:00:00,1,1\n';

    const result = parseSchedule(feed);

    expect(result.issues.map((issue) => issue.message)).toEqual([
      'unknown route_id "9999-10"',
      'unknown trip_id "9999-10-0"',
    ]);
    expect(result.schedule.trips).toHaveLength(1);
  });

  it('rejects the feed when a file or a required column is missing', () => {
    const withoutFile: Partial<ReturnType<typeof smallFeed>> = smallFeed();
    delete withoutFile.frequencies;
    const withoutColumn = smallFeed();
    withoutColumn.stops = 'stop_id,stop_name,stop_lat\n1,A,-23.5\n';

    expect(parseSchedule(withoutFile)).toMatchObject({
      usable: false,
      issues: [{ file: 'frequencies', line: 0, message: 'file is missing' }],
    });
    expect(parseSchedule(withoutColumn)).toMatchObject({
      usable: false,
      issues: [{ file: 'stops', line: 1, message: 'missing columns: stop_lon' }],
    });
  });

  it('rejects the feed when no route survives validation', () => {
    const feed = smallFeed();
    feed.routes = 'route_id,route_short_name,route_long_name,route_type\n,,,3\n';

    expect(parseSchedule(feed).usable).toBe(false);
  });
});

describe('feedValidity', () => {
  it('spans from the earliest start to the latest end', () => {
    const { schedule } = parseSchedule(fixtureFeed());

    expect(feedValidity(schedule.calendars)).toEqual({
      validFrom: new Date('2023-10-01T00:00:00Z'),
      validTo: new Date('2027-06-01T00:00:00Z'),
    });
  });

  it('is undefined without calendars', () => {
    expect(feedValidity([])).toBeUndefined();
  });
});
