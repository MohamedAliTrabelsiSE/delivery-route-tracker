import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  GeofenceTracker,
  decodePolyline,
  insideCircle,
  isOffRoute,
  type LatLng,
} from '@tracker/geo';
import { z } from 'zod';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { CLOCK, type Clock } from '../config/clock';
import { TrackingService } from '../tracking/tracking.service';
import { ToursService } from '../tours/tours.service';
import { TourStore } from '../tours/tour.store';
import type { Tour } from '../tours/tour.types';
import { MovementThrottle, RerouteGate } from './throttle';

export interface LiveClient {
  tourId?: string;
  trackingCode?: string;
  send(event: string, data: unknown): void;
}

export interface PositionUpdate {
  lat: number;
  lng: number;
  heading?: number;
}

const subscribeSchema = z.object({
  tourId: z.string().min(1).optional(),
  trackingCode: z.string().min(1).optional(),
});

@Injectable()
export class LiveService {
  private readonly clients = new Set<LiveClient>();
  private readonly positions: MovementThrottle;
  private readonly reroutes: RerouteGate;
  private readonly fences = new GeofenceTracker();

  constructor(
    private readonly store: TourStore,
    private readonly tours: ToursService,
    private readonly tracking: TrackingService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.positions = new MovementThrottle(
      clock,
      config.positionMinIntervalMs,
      config.positionMinMoveKm,
    );
    this.reroutes = new RerouteGate(clock, config.rerouteThrottleMs);
  }

  add(client: LiveClient): void {
    this.clients.add(client);
  }

  remove(client: LiveClient): void {
    this.clients.delete(client);
  }

  subscribe(client: LiveClient, raw: unknown): void {
    const parsed = subscribeSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    }
    const { tourId, trackingCode } = parsed.data;
    if (!tourId && !trackingCode) throw new Error('Provide a tourId or a trackingCode');
    if (tourId && !this.store.get(tourId)) throw new Error(`Unknown tour ${tourId}`);
    if (trackingCode && !this.store.findStop(trackingCode)) {
      throw new Error(`Unknown tracking code ${trackingCode}`);
    }
    client.tourId = tourId;
    client.trackingCode = trackingCode;
  }

  async updatePosition(
    driverId: string,
    position: PositionUpdate,
  ): Promise<{ accepted: boolean; reason?: string }> {
    const tour = this.store.tourOfDriver(driverId);
    if (!tour) throw new NotFoundException(`Unknown driver ${driverId}`);
    if (!this.positions.allow(driverId, position)) return { accepted: false, reason: 'throttled' };

    this.store.setFix({
      driverId,
      tourId: tour.id,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      at: new Date(this.clock.now()).toISOString(),
    });
    const fix = this.store.fix(driverId);
    this.emit('driver_position', fix, (client) => this.hearsTour(client, tour.id));

    const current = this.store.mutable(tour.id);
    if (current) this.watchGeofences(current, position);
    if (current?.route) {
      const line = decodePolyline(current.route.polyline);
      const offRoute = isOffRoute(position, line, this.config.offRouteKm);
      if (offRoute && this.reroutes.allow(tour.id)) {
        const updated = await this.tours.recalculate(tour.id, position);
        this.emit(
          'route_updated',
          { tourId: tour.id, polyline: updated.route?.polyline ?? '' },
          (client) => this.hearsTour(client, tour.id),
        );
      }
    }
    this.emitEtas(tour.id);
    return { accepted: true };
  }

  private watchGeofences(tour: Tour, position: LatLng): void {
    const zones = tour.stops
      .filter((stop) => stop.geofenceRadiusKm > 0)
      .map((stop) => ({
        id: stop.id,
        contains: (point: LatLng) => insideCircle(point, stop, stop.geofenceRadiusKm),
      }));
    const transitions = new Map(
      this.fences.update(position, zones).map((transition) => [transition.id, transition.type]),
    );
    for (const stop of tour.stops) {
      const type = transitions.get(stop.id);
      if (!type) continue;
      stop.status = type === 'enter' ? 'arriving' : 'arrived';
      this.emit(
        'geofence',
        { tourId: tour.id, stopId: stop.id, trackingCode: stop.trackingCode, type },
        (client) =>
          client.tourId === tour.id ||
          (stop.trackingCode !== null && client.trackingCode === stop.trackingCode),
      );
    }
  }

  private emitEtas(tourId: string): void {
    const tour = this.store.mutable(tourId);
    if (!tour) return;
    for (const stop of tour.stops) {
      if (!stop.trackingCode) continue;
      const snapshot = this.tracking.get(stop.trackingCode);
      this.emit(
        'eta_updated',
        {
          trackingCode: stop.trackingCode,
          etaMin: snapshot.etaMin,
          distanceKm: snapshot.distanceKm,
        },
        (client) => client.trackingCode === stop.trackingCode || client.tourId === tourId,
      );
    }
  }

  private hearsTour(client: LiveClient, tourId: string): boolean {
    if (client.tourId === tourId) return true;
    if (!client.trackingCode) return false;
    return this.store.findStop(client.trackingCode)?.tour.id === tourId;
  }

  private emit(event: string, data: unknown, include: (client: LiveClient) => boolean): void {
    for (const client of this.clients) {
      if (include(client)) client.send(event, data);
    }
  }
}
