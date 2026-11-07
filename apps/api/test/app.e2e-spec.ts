import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import WebSocket from 'ws';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { APP_CONFIG, loadConfig } from '../src/config/app-config';
import { CLOCK, fixedClock } from '../src/config/clock';

interface Frame {
  event: string;
  data: Record<string, unknown>;
}

describe('Delivery API (e2e)', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(
        loadConfig({
          ROUTING_PROVIDER: 'mock',
          GEOCODING_PROVIDER: 'mock',
          SIMULATE_DRIVER: 'false',
          POSITION_MIN_INTERVAL_MS: '0',
          POSITION_MIN_MOVE_KM: '0',
          OFF_ROUTE_KM: '0.15',
          REROUTE_THROTTLE_MS: '60000',
        }),
      )
      .overrideProvider(CLOCK)
      .useValue(fixedClock(1_700_000_000_000))
      .compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>({ logger: false }));
    await app.listen(0, '127.0.0.1');
    const { port } = app.getHttpServer().address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function openLive(): Promise<{ ws: WebSocket; frames: Frame[]; waitFor: (event: string) => Promise<Frame> }> {
    const frames: Frame[] = [];
    const ws = new WebSocket(base.replace('http', 'ws') + '/live');
    ws.on('message', (raw) => frames.push(JSON.parse(String(raw)) as Frame));
    const waitFor = (event: string): Promise<Frame> =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no ${event}; got ${frames.map((frame) => frame.event).join(',')}`)), 4000);
        const check = (): void => {
          const found = frames.find((frame) => frame.event === event);
          if (found) {
            clearTimeout(timer);
            resolve(found);
          }
        };
        ws.on('message', check);
        check();
      });
    return new Promise((resolve, reject) => {
      ws.once('open', () => resolve({ ws, frames, waitFor }));
      ws.once('error', reject);
    });
  }

  it('serves health and the openapi document', async () => {
    const health = await request(base).get('/health').expect(200);
    expect(health.body).toMatchObject({ status: 'ok', routing: 'mock', geocoding: 'mock', tourId: 'tour-paris' });
    const docs = await request(base).get('/docs-json').expect(200);
    expect(docs.body.paths['/tours/{id}/optimize']).toBeDefined();
  });

  it('searches and reverse geocodes the demo gazetteer', async () => {
    const search = await request(base).get('/geocode/search').query({ q: 'louvre' }).expect(200);
    expect(search.body.results[0].label).toContain('Louvre');
    await request(base).get('/geocode/search').query({ q: 'a' }).expect(400);
    const reverse = await request(base).get('/geocode/reverse').query({ lat: 48.8584, lng: 2.2945 }).expect(200);
    expect(reverse.body.result.label).toContain('Eiffel');
  });

  it('optimizes the tour, streams a position and reroutes off the road', async () => {
    const before = await request(base).get('/tours/tour-paris').expect(200);
    const beforeIds = before.body.stops.map((stop: { id: string }) => stop.id);

    const optimized = await request(base).post('/tours/tour-paris/optimize').expect(201);
    const afterIds = optimized.body.stops.map((stop: { id: string }) => stop.id);
    expect(afterIds).not.toEqual(beforeIds);
    expect(afterIds[0]).toBe('depot');

    const route = await request(base).get('/tours/tour-paris/route').expect(200);
    expect(route.body.polyline.length).toBeGreaterThan(0);
    expect(route.body.distanceKm).toBeLessThanOrEqual(before.body.route.distanceKm);

    const navigation = await request(base)
      .get('/tours/tour-paris/navigation')
      .query({ stopId: 'louvre', originLat: 48.8566, originLng: 2.3522 })
      .expect(200);
    expect(navigation.body.steps[0].instruction).toContain('Louvre');
    await request(base).get('/tours/tour-paris/navigation').expect(400);

    const live = await openLive();
    live.ws.send(JSON.stringify({ event: 'subscribe', data: { trackingCode: 'TRK-1001' } }));
    await live.waitFor('subscribed');

    await request(base).post('/drivers/driver-1/position').send({ lat: 48.8566, lng: 2.3522, heading: 10 }).expect(201);
    const position = await live.waitFor('driver_position');
    expect(position.data).toMatchObject({ driverId: 'driver-1', lat: 48.8566 });
    const eta = await live.waitFor('eta_updated');
    expect(eta.data).toMatchObject({ trackingCode: 'TRK-1001' });

    const tracking = await request(base).get('/tracking/TRK-1001').expect(200);
    expect(tracking.body.driver.lat).toBe(48.8566);

    await request(base).post('/drivers/driver-1/position').send({ lat: 49.2, lng: 2.3 }).expect(201);
    const rerouted = await live.waitFor('route_updated');
    expect(String(rerouted.data.polyline).length).toBeGreaterThan(0);

    const moved = await request(base)
      .put('/tracking/TRK-1001/location')
      .send({ lat: 48.853, lng: 2.3499, label: 'Notre-Dame' })
      .expect(200);
    expect(moved.body.label).toBe('Notre-Dame');

    await request(base).post('/tours/tour-paris/reverse').expect(201);
    await request(base).get('/tours/missing').expect(404);
    await request(base).post('/drivers/nobody/position').send({ lat: 48.8, lng: 2.3 }).expect(404);
    await request(base).post('/drivers/driver-1/position').send({ lat: 999, lng: 2 }).expect(400);

    live.ws.send(JSON.stringify({ event: 'ping' }));
    await live.waitFor('pong');
    live.ws.close();
  });
});
