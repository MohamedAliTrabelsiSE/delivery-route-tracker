import { MinIntervalLimiter, TtlCache } from './cache';
import { GeocodingError } from './geocoder';
import { NominatimGeocoder } from './nominatim-geocoder';

function geocoder(fetchImpl: jest.Mock): NominatimGeocoder {
  return new NominatimGeocoder(
    'https://nominatim.test',
    'delivery-route-tracker/test',
    new MinIntervalLimiter(0, { now: () => 0, sleep: async () => undefined }),
    new TtlCache(10, 1000, () => 0),
    fetchImpl,
    1000,
  );
}

describe('NominatimGeocoder', () => {
  it('searches, sends a User-Agent and caches the result', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ display_name: 'Louvre Museum', lat: '48.86', lon: '2.33' }, { lat: '1' }],
    });
    const client = geocoder(fetchImpl);
    const first = await client.search('Louvre', 5);
    const second = await client.search(' louvre ', 5);
    expect(first).toEqual([{ label: 'Louvre Museum', lat: 48.86, lng: 2.33 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/search?');
    expect(init.headers['User-Agent']).toBe('delivery-route-tracker/test');
  });

  it('reverse geocodes and caches', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ display_name: 'Rue de Rivoli', lat: '48.8601', lon: '2.3401' }),
    });
    const client = geocoder(fetchImpl);
    expect(await client.reverse(48.86011, 2.34014)).toMatchObject({ label: 'Rue de Rivoli' });
    await client.reverse(48.86012, 2.34015);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null when reverse has no label', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'Unable to geocode' }) });
    await expect(geocoder(fetchImpl).reverse(0, 0)).resolves.toBeNull();
  });

  it('rejects HTTP errors, network errors and a non-array search payload', async () => {
    const http = jest.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    await expect(geocoder(http).search('x', 1)).rejects.toThrow(GeocodingError);

    const offline = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(geocoder(offline).search('x', 1)).rejects.toThrow('offline');

    const weird = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ unexpected: true }) });
    await expect(geocoder(weird).search('x', 1)).resolves.toEqual([]);
  });
});
