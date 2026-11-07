import { loadConfig } from '../config/app-config';
import { GeocodingError, type Geocoder, type Place } from './geocoder';
import { systemClock } from '../config/clock';
import { geocodingProviders, GeocodingService } from './geocoding.service';
import { MockGeocoder } from './mock-geocoder';

function failing(): Geocoder {
  return {
    search: () => Promise.reject(new GeocodingError('down')),
    reverse: () => Promise.reject(new GeocodingError('down')),
  };
}

describe('MockGeocoder', () => {
  const geocoder = new MockGeocoder();

  it('finds a landmark and respects the limit', async () => {
    const results = await geocoder.search('louvre', 5);
    expect(results.map((place) => place.label)).toEqual(['Louvre Museum, Paris']);
    expect(await geocoder.search('paris', 1)).toHaveLength(1);
  });

  it('returns nothing for an unknown query', async () => {
    await expect(geocoder.search('xyzzy', 5)).resolves.toEqual([]);
  });

  it('snaps a reverse lookup to the nearest landmark, or labels the coordinates', async () => {
    const near = await geocoder.reverse(48.8607, 2.3377);
    expect(near?.label).toContain('Louvre');
    const far = await geocoder.reverse(0, 0);
    expect(far).toEqual({ label: '0.0000, 0.0000', lat: 0, lng: 0 });
  });
});

describe('GeocodingService', () => {
  const mock = new MockGeocoder();

  it('uses the mock geocoder in mock mode', async () => {
    const service = new GeocodingService(loadConfig({ GEOCODING_PROVIDER: 'mock' }), failing(), mock);
    expect(await service.search('eiffel', 3)).toHaveLength(1);
    expect(await service.reverse(48.8584, 2.2945)).toMatchObject({ label: expect.stringContaining('Eiffel') });
  });

  it('falls back to the gazetteer when Nominatim fails', async () => {
    const service = new GeocodingService(loadConfig({ GEOCODING_PROVIDER: 'nominatim' }), failing(), mock);
    expect(await service.search('bastille', 5)).toHaveLength(1);
    expect(await service.reverse(48.853, 2.369)).toMatchObject({ label: expect.stringContaining('Bastille') });
  });

  it('returns Nominatim results when they succeed', async () => {
    const place: Place = { label: 'Remote', lat: 1, lng: 2 };
    const nominatim: Geocoder = { search: async () => [place], reverse: async () => place };
    const service = new GeocodingService(loadConfig({}), nominatim, mock);
    expect(await service.search('remote', 5)).toEqual([place]);
    expect(await service.reverse(1, 2)).toEqual(place);
  });

  it('builds the default geocoders', () => {
    const config = loadConfig({});
    for (const provider of geocodingProviders) {
      const created = provider.useFactory
        ? provider.useFactory(config, systemClock)
        : new MockGeocoder();
      expect(created).toBeDefined();
    }
  });
});
