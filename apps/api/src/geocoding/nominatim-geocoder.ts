import { GeocodingError, type Geocoder, type Place } from './geocoder';
import type { MinIntervalLimiter, TtlCache } from './cache';

interface NominatimRow {
  display_name?: string;
  lat?: string;
  lon?: string;
  error?: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Forward and reverse geocoding against Nominatim.
 * Sends a User-Agent, waits for the rate limiter and caches identical queries.
 */
export class NominatimGeocoder implements Geocoder {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly limiter: MinIntervalLimiter,
    private readonly cache: TtlCache<Place[] | Place>,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 8000,
  ) {}

  async search(query: string, limit: number): Promise<Place[]> {
    const key = `search:${limit}:${query.trim().toLowerCase()}`;
    const cached = this.cache.get(key);
    if (Array.isArray(cached)) return cached;

    const url = `${this.baseUrl}/search?format=jsonv2&limit=${limit}&q=${encodeURIComponent(query)}`;
    const rows = (await this.request(url)) as NominatimRow[];
    const places = (Array.isArray(rows) ? rows : [])
      .filter((row) => row.lat !== undefined && row.lon !== undefined)
      .map((row) => ({ label: row.display_name ?? `${row.lat}, ${row.lon}`, lat: Number(row.lat), lng: Number(row.lon) }));
    this.cache.set(key, places);
    return places;
  }

  async reverse(lat: number, lng: number): Promise<Place | null> {
    const key = `reverse:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    if (cached && !Array.isArray(cached)) return cached;

    const url = `${this.baseUrl}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    const row = (await this.request(url)) as NominatimRow;
    if (!row.display_name || row.lat === undefined || row.lon === undefined) return null;
    const place = { label: row.display_name, lat: Number(row.lat), lng: Number(row.lon) };
    this.cache.set(key, place);
    return place;
  }

  private async request(url: string): Promise<unknown> {
    await this.limiter.wait();
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
      });
    } catch (error) {
      throw new GeocodingError(`Nominatim request failed: ${(error as Error).message}`);
    }
    if (!response.ok) throw new GeocodingError(`Nominatim HTTP ${response.status}`);
    return response.json();
  }
}
