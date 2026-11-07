import { encodePolyline, haversineKm, optimizeOrder } from '@tracker/geo';
import {
  emptyRoute,
  roundKm,
  roundMin,
  type ComputedRoute,
  type RouteLeg,
  type RoutePoint,
  type Router,
} from './route.types';

/** Geometry is the straight line between stops. Duration assumes a constant city speed. */
export class StraightLineRouter implements Router {
  constructor(private readonly speedKmh: number) {}

  route(points: RoutePoint[]): Promise<ComputedRoute> {
    return Promise.resolve(buildStraightRoute(points, this.speedKmh));
  }

  trip(points: RoutePoint[]): Promise<ComputedRoute> {
    const order = optimizeOrder(points.map((point) => ({ lat: point.lat, lng: point.lng })));
    return this.route(order.map((index) => points[index]));
  }
}

/** Same geometry as the straight-line router. Used when tests or demos must not touch the network. */
export class MockRouter extends StraightLineRouter {}

export function buildStraightRoute(points: RoutePoint[], speedKmh: number): ComputedRoute {
  if (points.length < 2) return emptyRoute(points);
  const legs: RouteLeg[] = [];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const distanceKm = haversineKm(from, to);
    const durationMin = (distanceKm / speedKmh) * 60;
    legs.push({
      fromId: from.id,
      toId: to.id,
      distanceKm: roundKm(distanceKm),
      durationMin: roundMin(durationMin),
      polyline: encodePolyline([from, to]),
      steps: [
        {
          instruction: `Continue to ${to.name}`,
          distanceKm: roundKm(distanceKm),
          lat: to.lat,
          lng: to.lng,
        },
      ],
    });
  }
  return {
    polyline: encodePolyline(points),
    distanceKm: roundKm(legs.reduce((sum, leg) => sum + leg.distanceKm, 0)),
    durationMin: roundMin(legs.reduce((sum, leg) => sum + leg.durationMin, 0)),
    legs,
    stopOrder: points.map((point) => point.id),
  };
}
