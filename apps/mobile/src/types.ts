export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trackingCode: string | null;
  kind: 'depot' | 'dropoff';
  status: 'pending' | 'arriving' | 'arrived';
  geofenceRadiusKm?: number;
}

export interface RouteStep {
  instruction: string;
  distanceKm: number;
  lat: number;
  lng: number;
}

export interface ComputedRoute {
  polyline: string;
  distanceKm: number;
  durationMin: number;
  legs: {
    fromId: string;
    toId: string;
    distanceKm: number;
    durationMin: number;
    polyline: string;
    steps: RouteStep[];
  }[];
  stopOrder: string[];
}

export interface Tour {
  id: string;
  name: string;
  driverId: string;
  stops: Stop[];
  deliveryZone?: { lat: number; lng: number }[];
  route: ComputedRoute | null;
}

export interface GeofenceNotice {
  tourId: string;
  stopId: string;
  trackingCode: string | null;
  type: 'enter' | 'exit';
}

export interface NavigationLeg {
  stopId: string;
  polyline: string;
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
}

export interface DriverFix {
  driverId: string;
  tourId: string;
  lat: number;
  lng: number;
  heading?: number;
  at: string;
}

export interface TrackingSnapshot {
  code: string;
  label: string;
  destination: { lat: number; lng: number };
  driver: { lat: number; lng: number; heading?: number; at: string } | null;
  polyline: string;
  etaMin: number;
  distanceKm: number;
  geofenceRadiusKm?: number;
}

export interface Place {
  label: string;
  lat: number;
  lng: number;
}
