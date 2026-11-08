import { GeofenceTracker, insideCircle, pointInPolygon } from './geofence';

const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
  { lat: 1, lng: 0 },
];

describe('insideCircle', () => {
  const center = { lat: 48.86, lng: 2.35 };

  it('includes the centre and excludes a point beyond the radius', () => {
    expect(insideCircle(center, center, 0)).toBe(true);
    expect(insideCircle({ lat: 48.862, lng: 2.35 }, center, 0.5)).toBe(true);
    expect(insideCircle({ lat: 49.2, lng: 2.35 }, center, 0.5)).toBe(false);
  });

  it('matches nothing when the radius is negative', () => {
    expect(insideCircle(center, center, -1)).toBe(false);
  });
});

describe('pointInPolygon', () => {
  it('rejects a ring that is not a polygon', () => {
    expect(pointInPolygon({ lat: 0, lng: 0 }, [])).toBe(false);
    expect(pointInPolygon({ lat: 0, lng: 0 }, square.slice(0, 2))).toBe(false);
  });

  it('tells the interior from the exterior', () => {
    expect(pointInPolygon({ lat: 0.5, lng: 0.5 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 2, lng: 2 }, square)).toBe(false);
    expect(pointInPolygon({ lat: 0.5, lng: -0.2 }, square)).toBe(false);
  });
});

describe('GeofenceTracker', () => {
  const zone = {
    id: 'louvre',
    contains: (point: { lat: number; lng: number }) => point.lat > 0,
  };

  it('emits enter on the first hit, stays quiet while inside, then emits exit', () => {
    const tracker = new GeofenceTracker();
    expect(tracker.update({ lat: -1, lng: 0 }, [zone])).toEqual([]);
    expect(tracker.update({ lat: 1, lng: 0 }, [zone])).toEqual([{ id: 'louvre', type: 'enter' }]);
    expect(tracker.update({ lat: 2, lng: 0 }, [zone])).toEqual([]);
    expect(tracker.update({ lat: -1, lng: 0 }, [zone])).toEqual([{ id: 'louvre', type: 'exit' }]);
  });

  it('emits enter immediately when the first point is already inside', () => {
    const tracker = new GeofenceTracker();
    expect(tracker.update({ lat: 1, lng: 0 }, [zone])).toEqual([{ id: 'louvre', type: 'enter' }]);
  });
});
