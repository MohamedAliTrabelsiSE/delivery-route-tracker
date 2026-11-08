import type { LatLng } from './types';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Length of a path, in kilometres. */
export function pathLengthKm(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

/**
 * Shortest distance from a point to a polyline, in kilometres.
 * Returns Infinity for an empty line and the distance to the only vertex for a single point.
 */
export function distanceToPolylineKm(point: LatLng, line: LatLng[]): number {
  if (line.length === 0) return Number.POSITIVE_INFINITY;
  if (line.length === 1) return haversineKm(point, line[0]);
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < line.length; i++) {
    best = Math.min(best, distanceToSegmentKm(point, line[i - 1], line[i]));
  }
  return best;
}

export function isOffRoute(point: LatLng, line: LatLng[], thresholdKm: number): boolean {
  return distanceToPolylineKm(point, line) > thresholdKm;
}

/** Index of the vertex closest to `point`. */
export function nearestVertex(point: LatLng, line: LatLng[]): number {
  let best = 0;
  let bestD = Number.POSITIVE_INFINITY;
  line.forEach((vertex, index) => {
    const d = haversineKm(point, vertex);
    if (d < bestD) {
      bestD = d;
      best = index;
    }
  });
  return best;
}

/** The point `distanceKm` along the line. Past the end, the last vertex is returned. */
export function pointAlongKm(line: LatLng[], distanceKm: number): LatLng {
  if (line.length === 0) throw new RangeError('pointAlongKm needs at least one point');
  if (distanceKm <= 0) return line[0];
  let left = distanceKm;
  for (let i = 1; i < line.length; i++) {
    const segment = haversineKm(line[i - 1], line[i]);
    if (left <= segment || i === line.length - 1) {
      const t = segment === 0 ? 0 : Math.min(1, left / segment);
      return {
        lat: line[i - 1].lat + (line[i].lat - line[i - 1].lat) * t,
        lng: line[i - 1].lng + (line[i].lng - line[i - 1].lng) * t,
      };
    }
    left -= segment;
  }
  return line[line.length - 1];
}

/** Kilometres of line remaining after (and including) the vertex nearest to `point`. */
export function remainingDistanceKm(point: LatLng, line: LatLng[]): number {
  if (line.length === 0) return 0;
  const index = nearestVertex(point, line);
  return haversineKm(point, line[index]) + pathLengthKm(line.slice(index));
}

/**
 * Local equirectangular projection around `a`, accurate for city-scale segments.
 */
function distanceToSegmentKm(point: LatLng, a: LatLng, b: LatLng): number {
  const kx = 111.32 * Math.cos((a.lat * Math.PI) / 180);
  const ky = 110.574;
  const bx = (b.lng - a.lng) * kx;
  const by = (b.lat - a.lat) * ky;
  const px = (point.lng - a.lng) * kx;
  const py = (point.lat - a.lat) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : clamp((px * bx + py * by) / len2, 0, 1);
  return Math.hypot(px - t * bx, py - t * by);
}

/** Clockwise bearing from north, in degrees, from `from` toward `to`. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
