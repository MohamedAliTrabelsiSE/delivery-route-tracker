import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { OsrmRouter } from './osrm-router';
import type { ComputedRoute, RoutePoint, Router } from './route.types';
import { MockRouter, StraightLineRouter } from './straight-line';

export const OSRM_ROUTER = Symbol('OSRM_ROUTER');
export const STRAIGHT_ROUTER = Symbol('STRAIGHT_ROUTER');
export const MOCK_ROUTER = Symbol('MOCK_ROUTER');

/**
 * Picks the configured router. The OSRM router falls back to straight lines, so a demo
 * still draws a route when the public server is down.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(OSRM_ROUTER) private readonly osrm: Router,
    @Inject(STRAIGHT_ROUTER) private readonly straight: Router,
    @Inject(MOCK_ROUTER) private readonly mock: Router,
  ) {}

  route(points: RoutePoint[]): Promise<ComputedRoute> {
    return this.call('route', points);
  }

  trip(points: RoutePoint[]): Promise<ComputedRoute> {
    return this.call('trip', points);
  }

  private async call(method: 'route' | 'trip', points: RoutePoint[]): Promise<ComputedRoute> {
    if (this.config.routingProvider === 'mock') return this.mock[method](points);
    if (this.config.routingProvider === 'straight') return this.straight[method](points);
    try {
      return await this.osrm[method](points);
    } catch (error) {
      this.logger.warn(`OSRM ${method} failed (${(error as Error).message}); using straight lines`);
      return this.straight[method](points);
    }
  }
}

export const routingProviders = [
  {
    provide: OSRM_ROUTER,
    inject: [APP_CONFIG],
    useFactory: (config: AppConfig) => new OsrmRouter(config.osrmUrl, fetch, config.osrmTimeoutMs),
  },
  {
    provide: STRAIGHT_ROUTER,
    inject: [APP_CONFIG],
    useFactory: (config: AppConfig) => new StraightLineRouter(config.averageSpeedKmh),
  },
  {
    provide: MOCK_ROUTER,
    inject: [APP_CONFIG],
    useFactory: (config: AppConfig) => new MockRouter(config.averageSpeedKmh),
  },
];
