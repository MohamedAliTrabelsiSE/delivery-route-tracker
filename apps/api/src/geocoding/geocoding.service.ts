import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { CLOCK, type Clock } from '../config/clock';
import { MinIntervalLimiter, TtlCache } from './cache';
import { type Geocoder, type Place } from './geocoder';
import { MockGeocoder } from './mock-geocoder';
import { NominatimGeocoder } from './nominatim-geocoder';

export const NOMINATIM_GEOCODER = Symbol('NOMINATIM_GEOCODER');
export const MOCK_GEOCODER = Symbol('MOCK_GEOCODER');

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(NOMINATIM_GEOCODER) private readonly nominatim: Geocoder,
    @Inject(MOCK_GEOCODER) private readonly mock: Geocoder,
  ) {}

  async search(query: string, limit = 5): Promise<Place[]> {
    if (this.config.geocodingProvider === 'mock') return this.mock.search(query, limit);
    try {
      return await this.nominatim.search(query, limit);
    } catch (error) {
      this.logger.warn(`Nominatim search failed (${(error as Error).message}); using the demo gazetteer`);
      return this.mock.search(query, limit);
    }
  }

  async reverse(lat: number, lng: number): Promise<Place | null> {
    if (this.config.geocodingProvider === 'mock') return this.mock.reverse(lat, lng);
    try {
      return await this.nominatim.reverse(lat, lng);
    } catch (error) {
      this.logger.warn(`Nominatim reverse failed (${(error as Error).message}); using the demo gazetteer`);
      return this.mock.reverse(lat, lng);
    }
  }
}

export const geocodingProviders = [
  { provide: MOCK_GEOCODER, useFactory: () => new MockGeocoder() },
  {
    provide: NOMINATIM_GEOCODER,
    inject: [APP_CONFIG, CLOCK],
    useFactory: (config: AppConfig, clock: Clock) =>
      new NominatimGeocoder(
        config.nominatimUrl,
        config.nominatimUserAgent,
        new MinIntervalLimiter(config.nominatimMinIntervalMs, {
          now: () => clock.now(),
          sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
        }),
        new TtlCache(config.cacheMax, config.cacheTtlMs, () => clock.now()),
        fetch,
        config.nominatimTimeoutMs,
      ),
  },
];
