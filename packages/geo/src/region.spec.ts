import { regionFromPoints } from './region';

describe('regionFromPoints', () => {
  it('frames the points with padding', () => {
    const region = regionFromPoints(
      [
        { lat: 48.8, lng: 2.2 },
        { lat: 48.9, lng: 2.4 },
      ],
      1.4,
    );
    expect(region.latitude).toBeCloseTo(48.85, 6);
    expect(region.longitude).toBeCloseTo(2.3, 6);
    expect(region.latitudeDelta).toBeCloseTo(0.14, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.28, 6);
  });

  it('keeps a minimum span for a single point', () => {
    const region = regionFromPoints([{ lat: 48.85, lng: 2.35 }]);
    expect(region.latitudeDelta).toBe(0.01);
    expect(region.longitudeDelta).toBe(0.01);
  });

  it('rejects an empty list', () => {
    expect(() => regionFromPoints([])).toThrow(RangeError);
  });
});
