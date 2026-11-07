import { BadRequestException } from '@nestjs/common';
import { loadConfig } from './config/app-config';
import { GeocodingController } from './geocoding/geocoding.controller';
import type { GeocodingService } from './geocoding/geocoding.service';
import { HealthController } from './health.controller';
import { LiveGateway } from './live/live.gateway';
import type { LiveService } from './live/live.service';
import { PositionController } from './live/position.controller';
import { TrackingController } from './tracking/tracking.controller';
import type { TrackingService } from './tracking/tracking.service';
import { ToursController } from './tours/tours.controller';
import type { ToursService } from './tours/tours.service';
import type { WebSocket } from 'ws';

describe('HTTP controllers', () => {
  it('reports health', () => {
    const health = new HealthController(loadConfig({ ROUTING_PROVIDER: 'mock', GEOCODING_PROVIDER: 'mock' }));
    expect(health.health()).toMatchObject({ status: 'ok', routing: 'mock', simulateDriver: false });
  });

  it('validates geocoding queries', async () => {
    const service = { search: jest.fn().mockResolvedValue([]), reverse: jest.fn().mockResolvedValue(null) };
    const controller = new GeocodingController(service as unknown as GeocodingService);
    await expect(controller.search('a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.search('louvre', '0')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.search('louvre', '2')).resolves.toEqual({ results: [] });
    await expect(controller.reverse('nope', '2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.reverse('91', '2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.reverse('48.8', '2.3')).resolves.toEqual({ result: null });
  });

  it('validates navigation origins and delegates tour routes', async () => {
    const tours = {
      list: () => [],
      get: jest.fn(),
      route: jest.fn(),
      optimize: jest.fn(),
      reverse: jest.fn(),
      recalculate: jest.fn(),
      navigation: jest.fn().mockResolvedValue({ stopId: 'louvre' }),
    };
    const controller = new ToursController(tours as unknown as ToursService);
    expect(controller.list()).toEqual([]);
    expect(() => controller.navigation('tour-paris')).toThrow(BadRequestException);
    expect(() => controller.navigation('tour-paris', 'louvre', 'x', '2')).toThrow(BadRequestException);
    expect(() => controller.navigation('tour-paris', 'louvre', '95', '2')).toThrow(BadRequestException);
    await controller.navigation('tour-paris', 'louvre', '48.8', '2.3');
    expect(tours.navigation).toHaveBeenCalledWith('tour-paris', 'louvre', { lat: 48.8, lng: 2.3 });
    await controller.navigation('tour-paris', 'louvre');
    expect(tours.navigation).toHaveBeenLastCalledWith('tour-paris', 'louvre', undefined);
    await controller.optimize('tour-paris');
    await controller.reverse('tour-paris');
    await controller.recalculate('tour-paris');
    controller.get('tour-paris');
    controller.route('tour-paris');
    expect(tours.optimize).toHaveBeenCalled();
  });

  it('delegates tracking and positions', async () => {
    const tracking = { get: jest.fn().mockReturnValue({ code: 'TRK-1001' }), setLocation: jest.fn().mockResolvedValue({}) };
    const track = new TrackingController(tracking as unknown as TrackingService);
    expect(track.get('TRK-1001')).toEqual({ code: 'TRK-1001' });
    await track.setLocation('TRK-1001', { lat: 1, lng: 2, label: 'Door' });
    expect(tracking.setLocation).toHaveBeenCalledWith('TRK-1001', 1, 2, 'Door');

    const live = { updatePosition: jest.fn().mockResolvedValue({ accepted: true }) };
    const positions = new PositionController(live as unknown as LiveService);
    await expect(positions.update('driver-1', { lat: 1, lng: 2 })).resolves.toEqual({ accepted: true });
  });
});

describe('LiveGateway', () => {
  function socket(): WebSocket & { frames: Array<{ event: string }> } {
    const frames: Array<{ event: string }> = [];
    return {
      readyState: 1,
      frames,
      send: (raw: string) => frames.push(JSON.parse(raw)),
    } as unknown as WebSocket & { frames: typeof frames };
  }

  it('subscribes, answers ping and reports errors', () => {
    const live = {
      add: jest.fn(),
      remove: jest.fn(),
      subscribe: jest.fn((_client: { trackingCode?: string }, data: { trackingCode?: string }) => {
        if (data.trackingCode === 'BAD') throw new Error('Unknown tracking code BAD');
        Object.assign(_client, data);
      }),
    };
    const gateway = new LiveGateway(live as unknown as LiveService);
    const client = socket();
    gateway.handleConnection(client);
    expect(live.add).toHaveBeenCalled();
    gateway.onSubscribe(client, { trackingCode: 'TRK-1001' });
    expect(client.frames.at(-1)?.event).toBe('subscribed');
    gateway.onSubscribe(client, { trackingCode: 'BAD' });
    expect(client.frames.at(-1)).toEqual({ event: 'error', data: { message: 'Unknown tracking code BAD' } });
    expect(gateway.onPing().event).toBe('pong');

    (client as { readyState: number }).readyState = 3;
    gateway.onSubscribe(client, { trackingCode: 'TRK-1001' });
    gateway.handleDisconnect(client);
    expect(live.remove).toHaveBeenCalled();
    gateway.handleDisconnect(client);
  });

  it('ignores a subscribe from an unknown socket', () => {
    const gateway = new LiveGateway({ add: jest.fn(), remove: jest.fn(), subscribe: jest.fn() } as unknown as LiveService);
    expect(() => gateway.onSubscribe({} as WebSocket, {})).not.toThrow();
  });
});
