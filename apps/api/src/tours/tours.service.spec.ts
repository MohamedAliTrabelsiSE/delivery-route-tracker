import { NotFoundException } from '@nestjs/common';
import { loadConfig } from '../config/app-config';
import { OsrmRouter } from '../routing/osrm-router';
import { RoutingService } from '../routing/routing.service';
import { MockRouter, StraightLineRouter } from '../routing/straight-line';
import { TourStore } from './tour.store';
import { ToursService } from './tours.service';

function setup(): { store: TourStore; tours: ToursService } {
  const store = new TourStore();
  const routing = new RoutingService(
    loadConfig({ ROUTING_PROVIDER: 'mock', AVERAGE_SPEED_KMH: '25' }),
    new OsrmRouter('http://unused', jest.fn()),
    new StraightLineRouter(25),
    new MockRouter(25),
  );
  return { store, tours: new ToursService(store, routing) };
}

describe('ToursService', () => {
  it('computes an initial route and lists the seeded tour', async () => {
    const { tours } = setup();
    await tours.onModuleInit();
    const tour = tours.get('tour-paris');
    expect(tour.name).toBe('Paris morning round');
    expect(tour.stops[0].id).toBe('depot');
    expect(tour.route?.stopOrder[0]).toBe('depot');
    expect(tours.list()).toHaveLength(1);
    expect(tours.route('tour-paris').distanceKm).toBeGreaterThan(0);
  });

  it('optimizes into a shorter order and keeps the depot first', async () => {
    const { tours } = setup();
    await tours.onModuleInit();
    const before = tours.get('tour-paris');
    const after = await tours.optimize('tour-paris');
    expect(after.stops.map((stop) => stop.id)).not.toEqual(before.stops.map((stop) => stop.id));
    expect(after.stops[0].id).toBe('depot');
    expect(after.route?.distanceKm).toBeLessThanOrEqual(before.route?.distanceKm ?? Infinity);
  });

  it('reverses the drop-offs and can start a route at the driver', async () => {
    const { tours } = setup();
    await tours.onModuleInit();
    const original = tours.get('tour-paris').stops.map((stop) => stop.id);
    const reversed = await tours.reverse('tour-paris');
    expect(reversed.stops.map((stop) => stop.id)).toEqual([original[0], ...original.slice(1).reverse()]);

    const fromDriver = await tours.recalculate('tour-paris', { lat: 48.87, lng: 2.33 });
    expect(fromDriver.route?.stopOrder[0]).toBe('driver');
    expect(fromDriver.stops[0].id).toBe('depot');
  });

  it('navigates to a stop from an explicit origin', async () => {
    const { tours } = setup();
    const leg = await tours.navigation('tour-paris', 'louvre', { lat: 48.8566, lng: 2.3522 });
    expect(leg.stopId).toBe('louvre');
    expect(leg.steps[0].instruction).toContain('Louvre');
    expect(leg.distanceKm).toBeGreaterThan(0);
  });

  it('navigates from the last driver fix when no origin is given', async () => {
    const { store, tours } = setup();
    store.setFix({ driverId: 'driver-1', tourId: 'tour-paris', lat: 48.85, lng: 2.35, at: 't' });
    const leg = await tours.navigation('tour-paris', 'louvre');
    expect(leg.distanceKm).toBeGreaterThan(0);
  });

  it('rejects unknown tours and stops', async () => {
    const { tours } = setup();
    expect(() => tours.get('nope')).toThrow(NotFoundException);
    expect(() => tours.route('tour-paris')).toThrow(NotFoundException);
    await expect(tours.optimize('nope')).rejects.toThrow(NotFoundException);
    await expect(tours.reverse('nope')).rejects.toThrow(NotFoundException);
    await expect(tours.recalculate('nope')).rejects.toThrow(NotFoundException);
    await expect(tours.navigation('tour-paris', 'missing')).rejects.toThrow(NotFoundException);
    await expect(tours.navigation('missing', 'louvre')).rejects.toThrow(NotFoundException);
  });
});

describe('TourStore', () => {
  it('refuses a partial reorder and an unknown code', () => {
    const store = new TourStore();
    expect(() => store.reorder('tour-paris', ['depot'])).toThrow(/every stop/);
    expect(() => store.moveStop('NOPE', 1, 2)).toThrow(/Unknown tracking code/);
    expect(store.fix('driver-1')).toBeUndefined();
    expect(store.tourOfDriver('nobody')).toBeUndefined();
    expect(store.get('missing')).toBeUndefined();
    expect(store.mutable('missing')).toBeUndefined();
  });

  it('moves a drop-off and returns copies of fixes', () => {
    const store = new TourStore();
    const moved = store.moveStop('TRK-1001', 48.861, 2.338, '  Louvre side door ');
    expect(moved.name).toBe('Louvre side door');
    store.setFix({ driverId: 'driver-1', tourId: 'tour-paris', lat: 1, lng: 2, at: 't' });
    const fix = store.fix('driver-1')!;
    fix.lat = 9;
    expect(store.fix('driver-1')?.lat).toBe(1);
    expect(store.get('tour-paris')?.stops.find((stop) => stop.id === 'louvre')?.lat).toBe(48.861);
  });
});
