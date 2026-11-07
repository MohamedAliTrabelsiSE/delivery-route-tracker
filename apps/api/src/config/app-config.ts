import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const bool = z.enum(['true', 'false', '1', '0']).transform((value) => value === 'true' || value === '1');

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  ROUTING_PROVIDER: z.enum(['osrm', 'straight', 'mock']).default('osrm'),
  OSRM_URL: z.string().url().default('https://router.project-osrm.org'),
  OSRM_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  GEOCODING_PROVIDER: z.enum(['nominatim', 'mock']).default('nominatim'),
  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org'),
  NOMINATIM_USER_AGENT: z.string().min(8).default('delivery-route-tracker/1.0 (educational demo)'),
  NOMINATIM_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(1000),
  NOMINATIM_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
  CACHE_MAX: z.coerce.number().int().positive().default(200),
  SIMULATE_DRIVER: bool.optional(),
  SIMULATOR_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
  OFF_ROUTE_KM: z.coerce.number().positive().default(0.15),
  REROUTE_THROTTLE_MS: z.coerce.number().int().nonnegative().default(180_000),
  POSITION_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(1000),
  POSITION_MIN_MOVE_KM: z.coerce.number().nonnegative().default(0.005),
  AVERAGE_SPEED_KMH: z.coerce.number().positive().default(25),
});

export interface AppConfig {
  port: number;
  routingProvider: 'osrm' | 'straight' | 'mock';
  osrmUrl: string;
  osrmTimeoutMs: number;
  geocodingProvider: 'nominatim' | 'mock';
  nominatimUrl: string;
  nominatimUserAgent: string;
  nominatimMinIntervalMs: number;
  nominatimTimeoutMs: number;
  cacheTtlMs: number;
  cacheMax: number;
  simulateDriver: boolean;
  simulatorIntervalMs: number;
  offRouteKm: number;
  rerouteThrottleMs: number;
  positionMinIntervalMs: number;
  positionMinMoveKm: number;
  averageSpeedKmh: number;
  tourId: string;
  driverId: string;
}

export const DEMO_TOUR_ID = 'tour-paris';
export const DEMO_DRIVER_ID = 'driver-1';

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value !== ''));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  const value = parsed.data;
  return {
    port: value.PORT,
    routingProvider: value.ROUTING_PROVIDER,
    osrmUrl: value.OSRM_URL.replace(/\/$/, ''),
    osrmTimeoutMs: value.OSRM_TIMEOUT_MS,
    geocodingProvider: value.GEOCODING_PROVIDER,
    nominatimUrl: value.NOMINATIM_URL.replace(/\/$/, ''),
    nominatimUserAgent: value.NOMINATIM_USER_AGENT,
    nominatimMinIntervalMs: value.NOMINATIM_MIN_INTERVAL_MS,
    nominatimTimeoutMs: value.NOMINATIM_TIMEOUT_MS,
    cacheTtlMs: value.CACHE_TTL_MS,
    cacheMax: value.CACHE_MAX,
    simulateDriver: value.SIMULATE_DRIVER ?? false,
    simulatorIntervalMs: value.SIMULATOR_INTERVAL_MS,
    offRouteKm: value.OFF_ROUTE_KM,
    rerouteThrottleMs: value.REROUTE_THROTTLE_MS,
    positionMinIntervalMs: value.POSITION_MIN_INTERVAL_MS,
    positionMinMoveKm: value.POSITION_MIN_MOVE_KM,
    averageSpeedKmh: value.AVERAGE_SPEED_KMH,
    tourId: DEMO_TOUR_ID,
    driverId: DEMO_DRIVER_ID,
  };
}
