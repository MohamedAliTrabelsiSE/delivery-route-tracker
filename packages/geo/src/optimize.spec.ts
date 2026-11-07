import { optimizeOrder, tourDistanceKm } from './optimize';

describe('optimizeOrder', () => {
  it('keeps the first point fixed and returns every index once', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 3 },
      { lat: 0, lng: 1 },
      { lat: 0, lng: 2 },
    ];
    const order = optimizeOrder(points);
    expect(order[0]).toBe(0);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is never longer than the input order', () => {
    const points = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.8867, lng: 2.3431 },
      { lat: 48.8448, lng: 2.3735 },
      { lat: 48.8584, lng: 2.2945 },
      { lat: 48.853, lng: 2.369 },
      { lat: 48.8738, lng: 2.295 },
    ];
    const input = points.map((_, index) => index);
    const order = optimizeOrder(points);
    expect(tourDistanceKm(points, order)).toBeLessThanOrEqual(tourDistanceKm(points, input));
  });

  it('uncrosses a bow-tie', () => {
    const square = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 0 },
    ];
    const order = optimizeOrder(square);
    expect(tourDistanceKm(square, order)).toBeLessThan(tourDistanceKm(square, [0, 1, 2, 3]));
  });

  it('leaves short paths untouched', () => {
    expect(optimizeOrder([{ lat: 1, lng: 1 }])).toEqual([0]);
    expect(optimizeOrder([{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }])).toEqual([0, 1]);
  });
});
