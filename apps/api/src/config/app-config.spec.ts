import { loadConfig } from './app-config';

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.routingProvider).toBe('osrm');
    expect(config.geocodingProvider).toBe('nominatim');
    expect(config.simulateDriver).toBe(false);
    expect(config.osrmUrl).toBe('https://router.project-osrm.org');
    expect(config.tourId).toBe('tour-paris');
  });

  it('strips a trailing slash and parses flags', () => {
    const config = loadConfig({
      OSRM_URL: 'http://osrm.internal/',
      NOMINATIM_URL: 'http://nominatim.internal/',
      SIMULATE_DRIVER: 'true',
      ROUTING_PROVIDER: 'mock',
      GEOCODING_PROVIDER: 'mock',
      PORT: '3099',
    });
    expect(config.osrmUrl).toBe('http://osrm.internal');
    expect(config.nominatimUrl).toBe('http://nominatim.internal');
    expect(config.simulateDriver).toBe(true);
    expect(config.port).toBe(3099);
  });

  it('treats an empty string as unset', () => {
    expect(loadConfig({ PORT: '' }).port).toBe(3000);
  });

  it('rejects an unknown provider', () => {
    expect(() => loadConfig({ ROUTING_PROVIDER: 'google' })).toThrow(/ROUTING_PROVIDER/);
  });
});
