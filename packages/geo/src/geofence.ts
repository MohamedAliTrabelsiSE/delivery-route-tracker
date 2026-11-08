import { haversineKm } from './distance';
import type { LatLng } from './types';

export type GeofenceTransitionType = 'enter' | 'exit';

export interface GeofenceZone {
  id: string;
  contains(point: LatLng): boolean;
}

export interface GeofenceTransition {
  id: string;
  type: GeofenceTransitionType;
}

/** True when `point` is within `radiusKm` of `center`. A negative radius matches nothing. */
export function insideCircle(point: LatLng, center: LatLng, radiusKm: number): boolean {
  if (radiusKm < 0) return false;
  return haversineKm(point, center) <= radiusKm;
}

/**
 * Ray-cast test. The ring does not need to repeat its first vertex.
 * Fewer than three vertices is never inside.
 */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const crossesLatitude = current.lat > point.lat !== previous.lat > point.lat;
    if (!crossesLatitude) continue;
    const edgeLng =
      ((previous.lng - current.lng) * (point.lat - current.lat)) / (previous.lat - current.lat) +
      current.lng;
    if (point.lng < edgeLng) inside = !inside;
  }
  return inside;
}

/**
 * Remembers which zones the last point was inside.
 * The first time a zone is seen, only `enter` is reported.
 */
export class GeofenceTracker {
  private readonly inside = new Map<string, boolean>();

  update(point: LatLng, zones: GeofenceZone[]): GeofenceTransition[] {
    const events: GeofenceTransition[] = [];
    for (const zone of zones) {
      const now = zone.contains(point);
      const was = this.inside.get(zone.id);
      this.inside.set(zone.id, now);
      if (was === undefined) {
        if (now) events.push({ id: zone.id, type: 'enter' });
        continue;
      }
      if (now === was) continue;
      events.push({ id: zone.id, type: now ? 'enter' : 'exit' });
    }
    return events;
  }
}
