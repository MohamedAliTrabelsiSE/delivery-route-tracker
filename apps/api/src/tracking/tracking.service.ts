import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  decodePolyline,
  encodePolyline,
  haversineKm,
  nearestVertex,
  pathLengthKm,
  pointInPolygon,
} from '@tracker/geo';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { roundKm, roundMin } from '../routing/route.types';
import { ToursService } from '../tours/tours.service';
import { TourStore } from '../tours/tour.store';

export interface TrackingSnapshot {
  code: string;
  label: string;
  destination: { lat: number; lng: number };
  driver: { lat: number; lng: number; heading?: number; at: string } | null;
  polyline: string;
  etaMin: number;
  distanceKm: number;
  geofenceRadiusKm: number;
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly store: TourStore,
    private readonly tours: ToursService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  get(code: string): TrackingSnapshot {
    const found = this.store.findStop(code);
    if (!found) throw new NotFoundException(`Tracking code ${code} not found`);
    const fix = this.store.fix(found.tour.driverId);
    const destination = { lat: found.stop.lat, lng: found.stop.lng };
    const line = found.tour.route ? decodePolyline(found.tour.route.polyline) : [];
    const remaining = remainingLine(line, fix, destination);
    const distanceKm =
      remaining.length > 1
        ? pathLengthKm(remaining)
        : haversineKm(fix ?? found.tour.stops[0], destination);
    return {
      code,
      label: found.stop.name,
      destination,
      driver: fix ? { lat: fix.lat, lng: fix.lng, heading: fix.heading, at: fix.at } : null,
      polyline: encodePolyline(remaining),
      etaMin: roundMin((distanceKm / this.config.averageSpeedKmh) * 60),
      distanceKm: roundKm(distanceKm),
      geofenceRadiusKm: found.stop.geofenceRadiusKm,
    };
  }

  async setLocation(
    code: string,
    lat: number,
    lng: number,
    label?: string,
  ): Promise<TrackingSnapshot> {
    const existing = this.store.findStop(code);
    if (!existing) throw new NotFoundException(`Tracking code ${code} not found`);
    const zone = existing.tour.deliveryZone;
    if (zone.length >= 3 && !pointInPolygon({ lat, lng }, zone)) {
      throw new BadRequestException('Drop-off is outside the delivery zone');
    }
    this.store.moveStop(code, lat, lng, label);
    const found = this.store.findStop(code);
    if (!found) throw new NotFoundException(`Tracking code ${code} not found`);
    const fix = this.store.fix(found.tour.driverId);
    await this.tours.recalculate(found.tour.id, fix ?? undefined);
    return this.get(code);
  }
}

function remainingLine(
  line: { lat: number; lng: number }[],
  from: { lat: number; lng: number } | undefined,
  to: { lat: number; lng: number },
): { lat: number; lng: number }[] {
  if (line.length === 0) return from ? [from, to] : [to];
  if (!from) return line;
  const start = nearestVertex(from, line);
  const end = nearestVertex(to, line);
  const [low, high] = start <= end ? [start, end] : [end, start];
  const slice = line.slice(low, high + 1);
  return slice.length > 0 ? slice : [from, to];
}
