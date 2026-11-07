import type { ComputedRoute } from '../routing/route.types';

export type StopKind = 'depot' | 'dropoff';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trackingCode: string | null;
  kind: StopKind;
  status: 'pending';
}

export interface Tour {
  id: string;
  name: string;
  driverId: string;
  stops: Stop[];
  route: ComputedRoute | null;
}

export interface DriverFix {
  driverId: string;
  tourId: string;
  lat: number;
  lng: number;
  heading?: number;
  at: string;
}
