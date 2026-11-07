import { OsrmRouter } from './osrm-router';
import { RoutingError } from './route.types';

const points = [
  { id: 'depot', name: 'Depot', lat: 48.85, lng: 2.35 },
  { id: 'louvre', name: 'Louvre', lat: 48.86, lng: 2.34 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const routeBody = {
  code: 'Ok',
  routes: [
    {
      distance: 1500,
      duration: 300,
      geometry: '_p~iF~ps|U',
      legs: [
        {
          distance: 1500,
          duration: 300,
          steps: [
            { distance: 1500, name: 'Rue de Rivoli', maneuver: { type: 'turn', modifier: 'left', location: [2.34, 48.86] } },
          ],
        },
      ],
    },
  ],
};

describe('OsrmRouter', () => {
  it('requests a route with longitude first and maps the legs', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(routeBody));
    const router = new OsrmRouter('https://osrm.test', fetchImpl, 1000);
    const route = await router.route(points);

    const url = String(fetchImpl.mock.calls[0][0]);
    expect(url).toContain('/route/v1/driving/2.35,48.85;2.34,48.86');
    expect(url).toContain('steps=true');
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(route.distanceKm).toBe(1.5);
    expect(route.durationMin).toBe(5);
    expect(route.stopOrder).toEqual(['depot', 'louvre']);
    expect(route.legs[0]).toMatchObject({ fromId: 'depot', toId: 'louvre' });
    expect(route.legs[0].steps[0].instruction).toBe('turn left onto Rue de Rivoli');
  });

  it('reorders stops from a trip response', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        waypoints: [{ waypoint_index: 0 }, { waypoint_index: 2 }, { waypoint_index: 1 }],
        trips: [{ ...routeBody.routes[0], legs: [routeBody.routes[0].legs[0], routeBody.routes[0].legs[0]] }],
      }),
    );
    const third = { id: 'arc', name: 'Arc', lat: 48.87, lng: 2.3 };
    const route = await new OsrmRouter('https://osrm.test', fetchImpl).trip([...points, third]);
    expect(route.stopOrder).toEqual(['depot', 'arc', 'louvre']);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('source=first');
  });

  it('returns an empty route for a single point', async () => {
    const fetchImpl = jest.fn();
    const route = await new OsrmRouter('https://osrm.test', fetchImpl).route([points[0]]);
    expect(route.legs).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(new OsrmRouter('https://osrm.test', fetchImpl).trip([points[0]])).resolves.toMatchObject({ legs: [] });
  });

  it.each([
    ['HTTP 503', jsonResponse({ code: 'Ok' }, 503), 'OSRM HTTP 503'],
    ['NoRoute', jsonResponse({ code: 'NoRoute', message: 'no route' }), 'no route'],
    ['missing route', jsonResponse({ code: 'Ok', routes: [] }), 'no route'],
  ])('rejects %s', async (_label, response, message) => {
    const fetchImpl = jest.fn().mockResolvedValue(response);
    await expect(new OsrmRouter('https://osrm.test', fetchImpl).route(points)).rejects.toThrow(RoutingError);
    await expect(new OsrmRouter('https://osrm.test', fetchImpl).route(points)).rejects.toThrow(message);
  });

  it('wraps network failures and a step without a street name', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(new OsrmRouter('https://osrm.test', failing).route(points)).rejects.toThrow('offline');

    const nameless = jsonResponse({
      code: 'Ok',
      routes: [{ ...routeBody.routes[0], legs: [{ distance: 10, duration: 5, steps: [{ distance: 10, maneuver: { type: 'depart', location: [2, 48] } }] }] }],
    });
    const route = await new OsrmRouter('https://osrm.test', jest.fn().mockResolvedValue(nameless)).route(points);
    expect(route.legs[0].steps[0].instruction).toBe('depart');
  });

  it('rejects a trip that has no usable waypoints', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ code: 'Ok', trips: [routeBody.routes[0]], waypoints: [] }));
    await expect(new OsrmRouter('https://osrm.test', fetchImpl).trip(points)).rejects.toThrow('no trip');
  });

  it('reports a code without a message', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({ code: 'InvalidUrl' }));
    await expect(new OsrmRouter('https://osrm.test', fetchImpl).route(points)).rejects.toThrow('OSRM InvalidUrl');
  });
});
