import { Injectable } from '@nestjs/common';
import type { ComputedRoute } from '../routing/route.types';
import { seedTour } from './seed';
import type { DriverFix, Stop, Tour } from './tour.types';

/** In-memory tours and the latest fix per driver. Swap this class for a database later. */
@Injectable()
export class TourStore {
  private readonly tours = new Map<string, Tour>([[seedTour().id, seedTour()]]);
  private readonly fixes = new Map<string, DriverFix>();

  list(): Tour[] {
    return [...this.tours.values()].map(clone);
  }

  get(id: string): Tour | undefined {
    const tour = this.tours.get(id);
    return tour ? clone(tour) : undefined;
  }

  /** The live object, for services that update it. Not for controllers. */
  mutable(id: string): Tour | undefined {
    return this.tours.get(id);
  }

  tourOfDriver(driverId: string): Tour | undefined {
    for (const tour of this.tours.values()) if (tour.driverId === driverId) return tour;
    return undefined;
  }

  findStop(trackingCode: string): { tour: Tour; stop: Stop } | undefined {
    for (const tour of this.tours.values()) {
      const stop = tour.stops.find((candidate) => candidate.trackingCode === trackingCode);
      if (stop) return { tour, stop };
    }
    return undefined;
  }

  setRoute(tourId: string, route: ComputedRoute): void {
    const tour = this.require(tourId);
    tour.route = route;
  }

  reorder(tourId: string, stopIds: string[]): Tour {
    const tour = this.require(tourId);
    const byId = new Map(tour.stops.map((stop) => [stop.id, stop]));
    const next = stopIds.map((id) => byId.get(id)).filter((stop): stop is Stop => stop !== undefined);
    if (next.length !== tour.stops.length) throw new Error('Reorder must include every stop');
    tour.stops = next;
    return clone(tour);
  }

  moveStop(trackingCode: string, lat: number, lng: number, label?: string): Stop {
    const found = this.findStop(trackingCode);
    if (!found) throw new Error(`Unknown tracking code ${trackingCode}`);
    found.stop.lat = lat;
    found.stop.lng = lng;
    if (label?.trim()) found.stop.name = label.trim();
    return { ...found.stop };
  }

  setFix(fix: DriverFix): void {
    this.fixes.set(fix.driverId, { ...fix });
  }

  fix(driverId: string): DriverFix | undefined {
    const fix = this.fixes.get(driverId);
    return fix ? { ...fix } : undefined;
  }

  private require(id: string): Tour {
    const tour = this.tours.get(id);
    if (!tour) throw new Error(`Unknown tour ${id}`);
    return tour;
  }
}

function clone(tour: Tour): Tour {
  return { ...tour, stops: tour.stops.map((stop) => ({ ...stop })), route: tour.route ? { ...tour.route, legs: tour.route.legs.map((leg) => ({ ...leg, steps: leg.steps.map((step) => ({ ...step })) })) } : null };
}
