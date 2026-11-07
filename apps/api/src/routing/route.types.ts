export interface RoutePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RouteStep {
  instruction: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface RouteLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMin: number;
  polyline: string;
  steps: RouteStep[];
}

export interface ComputedRoute {
  polyline: string;
  distanceKm: number;
  durationMin: number;
  legs: RouteLeg[];
  /** Stop ids in driving order. A leading "driver" id means the line starts at the driver. */
  stopOrder: string[];
}

export interface Router {
  route(points: RoutePoint[]): Promise<ComputedRoute>;
  /** Shortest order, keeping the first point fixed, plus the road geometry. */
  trip(points: RoutePoint[]): Promise<ComputedRoute>;
}

export class RoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoutingError';
  }
}

export function emptyRoute(points: RoutePoint[]): ComputedRoute {
  return {
    polyline: '',
    distanceKm: 0,
    durationMin: 0,
    legs: [],
    stopOrder: points.map((point) => point.id),
  };
}

export function roundKm(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundMin(value: number): number {
  return Math.round(value * 10) / 10;
}
