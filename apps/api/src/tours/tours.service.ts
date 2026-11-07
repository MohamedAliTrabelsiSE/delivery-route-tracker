import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { LatLng } from '@tracker/geo';
import type { ComputedRoute, RoutePoint } from '../routing/route.types';
import { RoutingService } from '../routing/routing.service';
import { TourStore } from './tour.store';
import type { Stop, Tour } from './tour.types';

export interface NavigationLeg {
  stopId: string;
  polyline: string;
  distanceKm: number;
  durationMin: number;
  steps: ComputedRoute['legs'][number]['steps'];
}

@Injectable()
export class ToursService implements OnModuleInit {
  constructor(
    private readonly store: TourStore,
    private readonly routing: RoutingService,
  ) {}

  async onModuleInit(): Promise<void> {
    const [first] = this.store.list();
    if (first) await this.recalculate(first.id);
  }

  list(): Tour[] {
    return this.store.list();
  }

  get(id: string): Tour {
    return this.require(id);
  }

  route(id: string): ComputedRoute {
    const route = this.require(id).route;
    if (!route) throw new NotFoundException(`Tour ${id} has no route yet`);
    return route;
  }

  async optimize(id: string): Promise<Tour> {
    const tour = this.requireMutable(id);
    const computed = await this.routing.trip(tour.stops.map(toPoint));
    this.store.reorder(id, computed.stopOrder.filter((stopId) => stopId !== 'driver'));
    this.store.setRoute(id, computed);
    return this.require(id);
  }

  async reverse(id: string): Promise<Tour> {
    const tour = this.requireMutable(id);
    const [depot, ...rest] = tour.stops;
    if (!depot) throw new NotFoundException(`Tour ${id} has no stops`);
    this.store.reorder(id, [depot.id, ...rest.map((stop) => stop.id).reverse()]);
    return this.recalculate(id);
  }

  /** Recomputes the road geometry. An origin (usually the driver) is prepended. */
  async recalculate(id: string, origin?: LatLng): Promise<Tour> {
    const tour = this.requireMutable(id);
    const points = tour.stops.map(toPoint);
    if (origin) points.unshift({ id: 'driver', name: 'Driver', ...origin });
    this.store.setRoute(id, await this.routing.route(points));
    return this.require(id);
  }

  async navigation(id: string, stopId: string, origin?: LatLng): Promise<NavigationLeg> {
    const tour = this.requireMutable(id);
    const stop = tour.stops.find((candidate) => candidate.id === stopId);
    if (!stop) throw new NotFoundException(`Stop ${stopId} not found on tour ${id}`);
    const from = origin ?? this.store.fix(tour.driverId) ?? tour.stops[0];
    const computed = await this.routing.route([
      { id: 'origin', name: 'Current position', lat: from.lat, lng: from.lng },
      toPoint(stop),
    ]);
    return {
      stopId,
      polyline: computed.polyline,
      distanceKm: computed.distanceKm,
      durationMin: computed.durationMin,
      steps: computed.legs[0]?.steps ?? [],
    };
  }

  private require(id: string): Tour {
    const tour = this.store.get(id);
    if (!tour) throw new NotFoundException(`Tour ${id} not found`);
    return tour;
  }

  private requireMutable(id: string): Tour {
    const tour = this.store.mutable(id);
    if (!tour) throw new NotFoundException(`Tour ${id} not found`);
    return tour;
  }
}

function toPoint(stop: Stop): RoutePoint {
  return { id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng };
}
