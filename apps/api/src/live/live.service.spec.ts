import { NotFoundException } from '@nestjs/common';
import { fixedClock } from '../config/clock';
import { loadConfig } from '../config/app-config';
import { OsrmRouter } from '../routing/osrm-router';
import { RoutingService } from '../routing/routing.service';
import { MockRouter, StraightLineRouter } from '../routing/straight-line';
import { TrackingService } from '../tracking/tracking.service';
import { TourStore } from '../tours/tour.store';
import { ToursService } from '../tours/tours.service';
import { LiveService, type LiveClient } from './live.service';
import { MovementThrottle, RerouteGate } from './throttle';

function client(): LiveClient & { events: Array<{ event: string; data: unknown }> } {
  const events: Array<{ event: string; data: unknown }> = [];
  return { events, send: (event, data) => events.push({ event, data }) };
}

async function live(
  env: Record<string, string> = {},
): Promise<{ service: LiveService; clock: ReturnType<typeof fixedClock>; store: TourStore }> {
  const clock = fixedClock(1_000_000);
  const config = loadConfig({
    ROUTING_PROVIDER: 'mock',
    POSITION_MIN_INTERVAL_MS: '0',
    POSITION_MIN_MOVE_KM: '0',
    OFF_ROUTE_KM: '0.15',
    REROUTE_THROTTLE_MS: '60000',
    ...env,
  });
  const store = new TourStore();
  const tours = new ToursService(
    store,
    new RoutingService(
      config,
      new OsrmRouter('http://unused', jest.fn()),
      new StraightLineRouter(25),
      new MockRouter(25),
    ),
  );
  await tours.onModuleInit();
  const tracking = new TrackingService(store, tours, config);
  return { service: new LiveService(store, tours, tracking, config, clock), clock, store };
}

describe('throttles', () => {
  const clock = fixedClock(0);

  it('drops a fix that barely moved', () => {
    const throttle = new MovementThrottle(clock, 10_000, 0.05);
    expect(throttle.allow('d', { lat: 48.85, lng: 2.35 })).toBe(true);
    expect(throttle.allow('d', { lat: 48.85001, lng: 2.35001 })).toBe(false);
    clock.set(20_000);
    expect(throttle.allow('d', { lat: 48.85001, lng: 2.35001 })).toBe(true);
  });

  it('allows one reroute per window', () => {
    const gate = new RerouteGate(clock, 1000);
    expect(gate.allow('tour')).toBe(true);
    expect(gate.allow('tour')).toBe(false);
    clock.set(clock.now() + 1000);
    expect(gate.allow('tour')).toBe(true);
  });
});

describe('LiveService', () => {
  it('rejects an unknown driver', async () => {
    const { service } = await live();
    await expect(service.updatePosition('nobody', { lat: 1, lng: 2 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('broadcasts a position and an ETA to tour and tracking subscribers', async () => {
    const { service } = await live();
    const tourSub = client();
    const parcelSub = client();
    const stranger = client();
    service.add(tourSub);
    service.add(parcelSub);
    service.add(stranger);
    service.subscribe(tourSub, { tourId: 'tour-paris' });
    service.subscribe(parcelSub, { trackingCode: 'TRK-1001' });

    const result = await service.updatePosition('driver-1', {
      lat: 48.8566,
      lng: 2.3522,
      heading: 90,
    });
    expect(result).toEqual({ accepted: true });
    expect(tourSub.events.map((event) => event.event)).toEqual(
      expect.arrayContaining(['driver_position', 'eta_updated']),
    );
    expect(parcelSub.events.find((event) => event.event === 'eta_updated')?.data).toMatchObject({
      trackingCode: 'TRK-1001',
    });
    expect(stranger.events).toEqual([]);
    const etas = parcelSub.events.filter((event) => event.event === 'eta_updated');
    expect(etas).toHaveLength(1);
  });

  it('reroutes once when the driver leaves the road', async () => {
    const { service, clock } = await live();
    const sub = client();
    service.add(sub);
    service.subscribe(sub, { tourId: 'tour-paris' });

    await service.updatePosition('driver-1', { lat: 49.5, lng: 2.3 });
    expect(sub.events.some((event) => event.event === 'route_updated')).toBe(true);

    sub.events.length = 0;
    clock.set(clock.now() + 1000);
    await service.updatePosition('driver-1', { lat: 49.6, lng: 2.4 });
    expect(sub.events.some((event) => event.event === 'route_updated')).toBe(false);
  });

  it('throttles a duplicate fix', async () => {
    const { service } = await live({
      POSITION_MIN_INTERVAL_MS: '10000',
      POSITION_MIN_MOVE_KM: '1',
    });
    expect((await service.updatePosition('driver-1', { lat: 48.85, lng: 2.35 })).accepted).toBe(
      true,
    );
    expect(await service.updatePosition('driver-1', { lat: 48.85001, lng: 2.35001 })).toEqual({
      accepted: false,
      reason: 'throttled',
    });
  });

  it('validates subscriptions', async () => {
    const { service } = await live();
    const sub = client();
    expect(() => service.subscribe(sub, {})).toThrow(/tourId or a trackingCode/);
    expect(() => service.subscribe(sub, { tourId: 'missing' })).toThrow(/Unknown tour/);
    expect(() => service.subscribe(sub, { trackingCode: 'NOPE' })).toThrow(/Unknown tracking code/);
    expect(() => service.subscribe(sub, { tourId: 4 })).toThrow();
    service.remove(sub);
  });

  it('marks a stop arriving when the driver enters its circle, then arrived on the way out', async () => {
    const { service, store } = await live();
    const parcel = client();
    const tourSub = client();
    service.add(parcel);
    service.add(tourSub);
    service.subscribe(parcel, { trackingCode: 'TRK-1001' });
    service.subscribe(tourSub, { tourId: 'tour-paris' });

    await service.updatePosition('driver-1', { lat: 48.8606, lng: 2.3376 });
    const entered = parcel.events.find((event) => event.event === 'geofence');
    expect(entered?.data).toMatchObject({
      stopId: 'louvre',
      trackingCode: 'TRK-1001',
      type: 'enter',
    });
    expect(store.mutable('tour-paris')?.stops.find((stop) => stop.id === 'louvre')?.status).toBe(
      'arriving',
    );
    expect(tourSub.events.some((event) => event.event === 'geofence')).toBe(true);

    parcel.events.length = 0;
    await service.updatePosition('driver-1', { lat: 49.1, lng: 2.35 });
    expect(parcel.events.find((event) => event.event === 'geofence')?.data).toMatchObject({
      stopId: 'louvre',
      type: 'exit',
    });
    expect(store.mutable('tour-paris')?.stops.find((stop) => stop.id === 'louvre')?.status).toBe(
      'arrived',
    );
  });

  it('skips a stop whose geofence radius is zero', async () => {
    const { service, store } = await live();
    const depot = store.mutable('tour-paris')?.stops.find((stop) => stop.id === 'depot');
    if (!depot) throw new Error('missing depot');
    depot.geofenceRadiusKm = 0;
    const sub = client();
    service.add(sub);
    service.subscribe(sub, { tourId: 'tour-paris' });
    await service.updatePosition('driver-1', { lat: depot.lat, lng: depot.lng });
    expect(
      sub.events.filter(
        (event) =>
          event.event === 'geofence' && (event.data as { stopId: string }).stopId === 'depot',
      ),
    ).toEqual([]);
  });

  it('ignores a broadcast to a removed client', async () => {
    const { service } = await live();
    const sub = client();
    service.add(sub);
    service.remove(sub);
    await service.updatePosition('driver-1', { lat: 48.85, lng: 2.35 });
    expect(sub.events).toEqual([]);
  });
});
