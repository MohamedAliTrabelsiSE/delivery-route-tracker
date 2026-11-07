import type { LatLng } from './types';

/**
 * Google's encoded polyline format, the same one OSRM returns for `geometries=polyline`.
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function encodePolyline(points: LatLng[], precision = 5): string {
  const factor = 10 ** precision;
  let lastLat = 0;
  let lastLng = 0;
  let out = '';
  for (const point of points) {
    const lat = Math.round(point.lat * factor);
    const lng = Math.round(point.lng * factor);
    out += encodeSigned(lat - lastLat);
    out += encodeSigned(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = 10 ** precision;
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    lat += decodeNext(encoded, () => index++);
    lng += decodeNext(encoded, () => index++);
    points.push({ lat: lat / factor, lng: lng / factor });
  }
  return points;
}

function encodeSigned(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

function decodeNext(encoded: string, nextIndex: () => number): number {
  let result = 0;
  let shift = 0;
  let chunk = 0;
  do {
    chunk = encoded.charCodeAt(nextIndex()) - 63;
    result |= (chunk & 0x1f) << shift;
    shift += 5;
  } while (chunk >= 0x20);
  return result & 1 ? ~(result >> 1) : result >> 1;
}
