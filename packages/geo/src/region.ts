import type { LatLng, MapRegion } from './types';

/** A region that frames every point, padded so markers are not on the edge. */
export function regionFromPoints(points: LatLng[], padding = 1.4): MapRegion {
  if (points.length === 0) throw new RangeError('regionFromPoints needs at least one point');
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.01, (maxLat - minLat) * padding),
    longitudeDelta: Math.max(0.01, (maxLng - minLng) * padding),
  };
}
