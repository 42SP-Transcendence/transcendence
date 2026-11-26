import type { Schedule } from './schedule';

type Ring = [number, number][];
type Polygon = Ring[];

export type DistrictOutline = { id: number; geometry: unknown };

export type RouteDistrict = { routeId: string; districtId: number };

type Area = {
  id: number;
  polygons: Polygon[];
  box: { minLon: number; maxLon: number; minLat: number; maxLat: number };
};

/**
 * Tells whether a value is a ring of [lon, lat] pairs.
 */
function isRing(value: unknown): value is Ring {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === 'number' &&
        typeof point[1] === 'number',
    )
  );
}

/**
 * Tells whether a value is a polygon: an outer ring followed by its holes.
 */
function isPolygon(value: unknown): value is Polygon {
  return Array.isArray(value) && value.length > 0 && value.every(isRing);
}

/**
 * Reads the polygons of a GeoJSON Polygon or MultiPolygon, or none when the geometry is missing or malformed.
 */
function polygonsOf(geometry: unknown): Polygon[] {
  if (typeof geometry !== 'object' || geometry === null) {
    return [];
  }
  const { type, coordinates } = geometry as { type?: unknown; coordinates?: unknown };
  if (type === 'Polygon' && isPolygon(coordinates)) {
    return [coordinates];
  }
  if (type === 'MultiPolygon' && Array.isArray(coordinates) && coordinates.every(isPolygon)) {
    return coordinates as Polygon[];
  }
  return [];
}

/**
 * Builds the searchable area of a district, or null when it has no usable outline.
 */
function areaOf(district: DistrictOutline): Area | null {
  const polygons = polygonsOf(district.geometry);
  if (polygons.length === 0) {
    return null;
  }
  const points = polygons.flatMap((polygon) => polygon[0] ?? []);
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
  return {
    id: district.id,
    polygons,
    box: {
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
    },
  };
}

/**
 * Tells whether a point is inside a ring, by counting how many edges a ray from the point crosses.
 */
function insideRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lonI, latI] = ring[i] as [number, number];
    const [lonJ, latJ] = ring[j] as [number, number];
    if (latI > lat !== latJ > lat && lon < ((lonJ - lonI) * (lat - latI)) / (latJ - latI) + lonI) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Tells whether a point is inside an area: inside the outer ring of one polygon and outside its holes.
 */
function insideArea(lon: number, lat: number, area: Area): boolean {
  const { box } = area;
  if (lon < box.minLon || lon > box.maxLon || lat < box.minLat || lat > box.maxLat) {
    return false;
  }
  return area.polygons.some(
    ([outer, ...holes]) =>
      outer !== undefined &&
      insideRing(lon, lat, outer) &&
      !holes.some((hole) => insideRing(lon, lat, hole)),
  );
}

/**
 * Links each route to every district that contains at least one of its stops; districts without an outline are ignored.
 */
export function routeDistricts(schedule: Schedule, districts: DistrictOutline[]): RouteDistrict[] {
  const areas = districts.map(areaOf).filter((area): area is Area => area !== null);
  if (areas.length === 0) {
    return [];
  }
  const stops = new Map(schedule.stops.map((stop) => [stop.stopId, stop]));
  const routeOfTrip = new Map(schedule.trips.map((trip) => [trip.tripId, trip.routeId]));
  const districtsOfStop = new Map<bigint, number[]>();
  const pairs = new Map<string, RouteDistrict>();
  for (const stopTime of schedule.stopTimes) {
    const routeId = routeOfTrip.get(stopTime.tripId);
    const stop = stops.get(stopTime.stopId);
    if (routeId === undefined || stop === undefined) {
      continue;
    }
    let found = districtsOfStop.get(stop.stopId);
    if (found === undefined) {
      found = areas.filter((area) => insideArea(stop.lon, stop.lat, area)).map((area) => area.id);
      districtsOfStop.set(stop.stopId, found);
    }
    for (const districtId of found) {
      pairs.set(`${routeId}\u0000${districtId}`, { routeId, districtId });
    }
  }
  return [...pairs.values()];
}
