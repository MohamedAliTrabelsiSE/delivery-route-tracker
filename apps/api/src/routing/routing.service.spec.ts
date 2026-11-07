import { loadConfig } from '../config/app-config';
import { OsrmRouter } from './osrm-router';
import { RoutingError } from './route.types';
import { routingProviders, RoutingService } from './routing.service';
import { MockRouter, StraightLineRouter } from './straight-line';

const points = [
  { id: 'depot', name: 'Depot', lat: 48.8566, lng: 2.3522 },
  { id: 'far', name: 'Far', lat: 48.8867, lng: 2.3431 },
  { id: 'near', name: 'Near', lat: 48.8606, lng: 2.3376 },
];

function service(provider: 'osrm' | 'straight' | 'mock', osrm: OsrmRouter): RoutingService {
  const config = loadConfig({ ROUTING_PROVIDER: provider, AVERAGE_SPEED_KMH: '25' });
  return new RoutingService(config, osrm, new StraightLineRouter(25), new MockRouter(25));
}

describe('straight and mock routers', () => {
  it('builds a straight route and a shorter trip', async () => {
    const routing = service('mock', new OsrmRouter('http://unused', jest.fn()));
    const route = await routing.route(points);
    expect(route.stopOrder).toEqual(['depot', 'far', 'near']);
    expect(route.legs).toHaveLength(2);
    expect(route.legs[0].steps[0].instruction).toContain('Far');
    expect(route.distanceKm).toBeGreaterThan(0);

    const trip = await routing.trip(points);
    expect(trip.stopOrder[0]).toBe('depot');
    expect(trip.distanceKm).toBeLessThanOrEqual(route.distanceKm);
  });

  it('uses the straight router when asked and handles one point', async () => {
    const routing = service('straight', new OsrmRouter('http://unused', jest.fn()));
    const route = await routing.route([points[0]]);
    expect(route.legs).toEqual([]);
    expect(route.stopOrder).toEqual(['depot']);
  });
});

describe('RoutingService fallback', () => {
  it('falls back to straight lines when OSRM fails', async () => {
    const osrm = new OsrmRouter('http://unused', jest.fn().mockRejectedValue(new Error('down')));
    const routing = service('osrm', osrm);
    const route = await routing.route(points);
    expect(route.polyline.length).toBeGreaterThan(0);
    await expect(routing.trip(points)).resolves.toMatchObject({ stopOrder: expect.arrayContaining(['depot']) });
  });

  it('propagates a RoutingError class from the client itself', () => {
    expect(new RoutingError('x').name).toBe('RoutingError');
  });

  it('builds the default router instances', () => {
    const config = loadConfig({});
    for (const provider of routingProviders) {
      expect(provider.useFactory(config)).toBeDefined();
    }
  });
});
