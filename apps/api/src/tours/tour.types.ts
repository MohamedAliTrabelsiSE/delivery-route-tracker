import type { LatLng } from '@tracker/geo';
import type { ComputedRoute } from '../routing/route.types';

export type StopKind = 'depot' | 'dropoff';
export type StopStatus = 'pending' | 'arriving' | 'arrived';

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trackingCode: string | null;
  kind: StopKind;
  status: StopStatus;
  /** Radius, in kilometres, that marks the driver as arriving. Zero disables it. */
  geofenceRadiusKm: number;
}

export interface Tour {
  id: string;
  name: string;
  driverId: string;
  stops: Stop[];
  /** Drop-offs must stay inside this ring. */
  deliveryZone: LatLng[];
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
