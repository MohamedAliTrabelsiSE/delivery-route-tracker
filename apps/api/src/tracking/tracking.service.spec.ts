import { NotFoundException } from '@nestjs/common';
import { loadConfig } from '../config/app-config';
import { OsrmRouter } from '../routing/osrm-router';
import { RoutingService } from '../routing/routing.service';
import { MockRouter, StraightLineRouter } from '../routing/straight-line';
import { TourStore } from '../tours/tour.store';
import { ToursService } from '../tours/tours.service';
import { TrackingService } from './tracking.service';

async function tracking(): Promise<{ service: TrackingService; store: TourStore; tours: ToursService }> {
  const store = new TourStore();
  const tours = new ToursService(
    store,
    new RoutingService(
      loadConfig({ ROUTING_PROVIDER: 'mock' }),
      new OsrmRouter('http://unused', jest.fn()),
      new StraightLineRouter(25),
      new MockRouter(25),
    ),
  );
  await tours.onModuleInit();
  return { service: new TrackingService(store, tours, loadConfig({ AVERAGE_SPEED_KMH: '25' })), store, tours };
}

describe('TrackingService', () => {
  it('describes a parcel before any driver fix exists', async () => {
    const { service } = await tracking();
    const snapshot = service.get('TRK-1001');
    expect(snapshot).toMatchObject({ code: 'TRK-1001', label: 'Louvre Museum', driver: null });
    expect(snapshot.distanceKm).toBeGreaterThan(0);
    expect(snapshot.etaMin).toBeGreaterThan(0);
    expect(snapshot.polyline.length).toBeGreaterThan(0);
  });

  it('shrinks the remaining line once the driver is on the road', async () => {
    const { service, store } = await tracking();
    const full = service.get('TRK-1006').distanceKm;
    store.setFix({ driverId: 'driver-1', tourId: 'tour-paris', lat: 48.8448, lng: 2.3735, at: 't' });
    const snapshot = service.get('TRK-1006');
    expect(snapshot.driver?.lat).toBeCloseTo(48.8448, 4);
    expect(snapshot.distanceKm).toBeLessThan(full);
  });

  it('moves the pin, renames it and recomputes the route', async () => {
    const { service } = await tracking();
    const updated = await service.setLocation('TRK-1001', 48.853, 2.3499, 'Notre-Dame');
    expect(updated.label).toBe('Notre-Dame');
    expect(updated.destination).toEqual({ lat: 48.853, lng: 2.3499 });
  });

  it('rejects an unknown code', async () => {
    const { service } = await tracking();
    expect(() => service.get('NOPE')).toThrow(NotFoundException);
    await expect(service.setLocation('NOPE', 48.8, 2.3)).rejects.toThrow(NotFoundException);
  });
});
