import { encodePolyline } from '@tracker/geo';
import {
  emptyRoute,
  RoutingError,
  roundKm,
  roundMin,
  type ComputedRoute,
  type RouteLeg,
  type RoutePoint,
  type RouteStep,
  type Router,
} from './route.types';

interface OsrmStep {
  distance: number;
  name?: string;
  maneuver: { type: string; modifier?: string; location: [number, number] };
}

interface OsrmLeg {
  distance: number;
  duration: number;
  steps?: OsrmStep[];
}

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs: OsrmLeg[];
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes?: OsrmRoute[];
  trips?: OsrmRoute[];
  waypoints?: Array<{ waypoint_index: number }>;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Driving directions from a public or self-hosted OSRM server.
 * `route` keeps the given order; `trip` asks OSRM to reorder the stops (first one fixed).
 */
export class OsrmRouter implements Router {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 8000,
  ) {}

  async route(points: RoutePoint[]): Promise<ComputedRoute> {
    if (points.length < 2) return emptyRoute(points);
    const body = await this.get(`/route/v1/driving/${coordinates(points)}?${query}`);
    const route = body.routes?.[0];
    if (!route) throw new RoutingError('OSRM returned no route');
    return toComputed(route, points);
  }

  async trip(points: RoutePoint[]): Promise<ComputedRoute> {
    if (points.length < 2) return emptyRoute(points);
    const body = await this.get(
      `/trip/v1/driving/${coordinates(points)}?source=first&roundtrip=false&${query}`,
    );
    const trip = body.trips?.[0];
    const waypoints = body.waypoints;
    if (!trip || !waypoints || waypoints.length !== points.length) {
      throw new RoutingError('OSRM returned no trip');
    }
    const ordered = waypoints
      .map((waypoint, inputIndex) => ({ inputIndex, position: waypoint.waypoint_index }))
      .sort((a, b) => a.position - b.position)
      .map((entry) => points[entry.inputIndex]);
    return toComputed(trip, ordered);
  }

  private async get(path: string): Promise<OsrmResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new RoutingError(`OSRM request failed: ${(error as Error).message}`);
    }
    if (!response.ok) throw new RoutingError(`OSRM HTTP ${response.status}`);
    const body = (await response.json()) as OsrmResponse;
    if (body.code !== 'Ok') throw new RoutingError(body.message ?? `OSRM ${body.code}`);
    return body;
  }
}

const query = 'overview=full&geometries=polyline&steps=true';

function coordinates(points: RoutePoint[]): string {
  return points.map((point) => `${point.lng},${point.lat}`).join(';');
}

function toComputed(route: OsrmRoute, points: RoutePoint[]): ComputedRoute {
  const legs: RouteLeg[] = route.legs.map((leg, index) => {
    const from = points[index];
    const to = points[index + 1];
    const steps = (leg.steps ?? []).map(toStep);
    return {
      fromId: from?.id ?? `leg-${index}-from`,
      toId: to?.id ?? `leg-${index}-to`,
      distanceKm: roundKm(leg.distance / 1000),
      durationMin: roundMin(leg.duration / 60),
      polyline: encodePolyline(steps.map((step) => ({ lat: step.lat, lng: step.lng }))),
      steps,
    };
  });
  return {
    polyline: route.geometry,
    distanceKm: roundKm(route.distance / 1000),
    durationMin: roundMin(route.duration / 60),
    legs,
    stopOrder: points.map((point) => point.id),
  };
}

function toStep(step: OsrmStep): RouteStep {
  const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
  const onto = step.name ? ` onto ${step.name}` : '';
  const [lng, lat] = step.maneuver.location;
  return {
    instruction: `${step.maneuver.type}${modifier}${onto}`,
    distanceKm: roundKm(step.distance / 1000),
    lat,
    lng,
  };
}
