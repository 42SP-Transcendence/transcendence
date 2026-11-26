import { type DistrictOutline, routeDistricts } from './route-districts';
import type { Schedule } from './schedule';

/**
 * Builds a square ring around a center, with the given half side in degrees.
 */
function square(lon: number, lat: number, half: number): [number, number][] {
  return [
    [lon - half, lat - half],
    [lon + half, lat - half],
    [lon + half, lat + half],
    [lon - half, lat + half],
    [lon - half, lat - half],
  ];
}

/**
 * Builds a schedule where each route runs one trip through the given stops.
 */
function schedule(routes: Record<string, [number, number][]>): Schedule {
  const stops: Schedule['stops'] = [];
  const trips: Schedule['trips'] = [];
  const stopTimes: Schedule['stopTimes'] = [];
  for (const [routeId, points] of Object.entries(routes)) {
    trips.push({
      tripId: `${routeId}-0`,
      routeId,
      serviceId: 'USD',
      directionId: 0,
      headsign: null,
    });
    points.forEach(([lon, lat], index) => {
      const stopId = BigInt(stops.length + 1);
      stops.push({ stopId, name: `stop ${stopId}`, lat, lon });
      stopTimes.push({
        tripId: `${routeId}-0`,
        stopSequence: index + 1,
        stopId,
        arrivalOffsetSecs: index * 60,
      });
    });
  }
  return { routes: [], calendars: [], stops, trips, stopTimes, frequencies: [] };
}

const lapa: DistrictOutline = {
  id: 1,
  geometry: { type: 'Polygon', coordinates: [square(-46.7, -23.5, 0.02)] },
};
const se: DistrictOutline = {
  id: 2,
  geometry: { type: 'Polygon', coordinates: [square(-46.63, -23.55, 0.02)] },
};

describe('routeDistricts', () => {
  it('links a route to every district that holds one of its stops, once each', () => {
    const feed = schedule({
      '8000-10': [
        [-46.7, -23.5],
        [-46.69, -23.49],
        [-46.63, -23.55],
      ],
      '175T-10': [[-46.63, -23.55]],
    });

    expect(routeDistricts(feed, [lapa, se])).toEqual([
      { routeId: '8000-10', districtId: 1 },
      { routeId: '8000-10', districtId: 2 },
      { routeId: '175T-10', districtId: 2 },
    ]);
  });

  it('leaves out stops outside every district', () => {
    expect(routeDistricts(schedule({ '8000-10': [[-46.4, -23.7]] }), [lapa, se])).toEqual([]);
  });

  it('reads multipolygons and leaves out stops inside a hole', () => {
    const district: DistrictOutline = {
      id: 3,
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [square(-46.7, -23.5, 0.02), square(-46.7, -23.5, 0.005)],
          [square(-46.63, -23.55, 0.02)],
        ],
      },
    };
    const feed = schedule({
      hole: [[-46.7, -23.5]],
      ring: [[-46.715, -23.5]],
      other: [[-46.63, -23.55]],
    });

    expect(routeDistricts(feed, [district])).toEqual([
      { routeId: 'ring', districtId: 3 },
      { routeId: 'other', districtId: 3 },
    ]);
  });

  it('returns nothing while no district has an outline', () => {
    const feed = schedule({ '8000-10': [[-46.7, -23.5]] });

    expect(routeDistricts(feed, [])).toEqual([]);
    expect(routeDistricts(feed, [{ id: 1, geometry: null }])).toEqual([]);
  });

  it('ignores districts whose outline is not a GeoJSON polygon', () => {
    const feed = schedule({ '8000-10': [[-46.7, -23.5]] });
    const broken: DistrictOutline[] = [
      { id: 4, geometry: { type: 'Point', coordinates: [-46.7, -23.5] } },
      { id: 5, geometry: { type: 'Polygon', coordinates: [[[-46.7, -23.5]]] } },
    ];

    expect(routeDistricts(feed, [...broken, lapa])).toEqual([
      { routeId: '8000-10', districtId: 1 },
    ]);
  });
});
