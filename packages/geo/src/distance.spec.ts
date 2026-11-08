import {
  bearingDegrees,
  distanceToPolylineKm,
  haversineKm,
  isOffRoute,
  nearestVertex,
  pathLengthKm,
  pointAlongKm,
  remainingDistanceKm,
} from './distance';

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm({ lat: 48.85, lng: 2.35 }, { lat: 48.85, lng: 2.35 })).toBe(0);
  });

  it('measures about 111 km per degree of latitude', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 0);
  });

  it('is symmetric', () => {
    const a = { lat: 48.85, lng: 2.29 };
    const b = { lat: 48.88, lng: 2.35 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 9);
  });
});

describe('bearingDegrees', () => {
  it('points north, east, and back toward the start', () => {
    expect(bearingDegrees({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 5);
    expect(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 5);
    expect(bearingDegrees({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBeCloseTo(0, 5);
  });
});

describe('pathLengthKm', () => {
  it('sums the segments', () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
      { lat: 1, lng: 1 },
    ];
    expect(pathLengthKm(points)).toBeCloseTo(
      haversineKm(points[0], points[1]) + haversineKm(points[1], points[2]),
      9,
    );
    expect(pathLengthKm([])).toBe(0);
    expect(pathLengthKm([points[0]])).toBe(0);
  });
});

describe('distanceToPolylineKm', () => {
  const line = [
    { lat: 48.85, lng: 2.3 },
    { lat: 48.85, lng: 2.4 },
  ];

  it('is zero for a point on the segment', () => {
    expect(distanceToPolylineKm({ lat: 48.85, lng: 2.35 }, line)).toBeLessThan(0.01);
  });

  it('is about 1.1 km for a point 0.01 degrees north of the segment', () => {
    expect(distanceToPolylineKm({ lat: 48.86, lng: 2.35 }, line)).toBeCloseTo(1.11, 1);
  });

  it('clamps to the endpoints instead of the infinite line', () => {
    const pastEnd = distanceToPolylineKm({ lat: 48.85, lng: 2.5 }, line);
    expect(pastEnd).toBeCloseTo(haversineKm({ lat: 48.85, lng: 2.4 }, { lat: 48.85, lng: 2.5 }), 1);
  });

  it('handles empty and single-point lines', () => {
    expect(distanceToPolylineKm({ lat: 1, lng: 1 }, [])).toBe(Number.POSITIVE_INFINITY);
    expect(distanceToPolylineKm({ lat: 1, lng: 1 }, [{ lat: 1, lng: 1 }])).toBe(0);
  });

  it('handles a zero-length segment', () => {
    const doubled = [
      { lat: 48.85, lng: 2.3 },
      { lat: 48.85, lng: 2.3 },
    ];
    expect(distanceToPolylineKm({ lat: 48.85, lng: 2.3 }, doubled)).toBe(0);
  });
});

describe('isOffRoute', () => {
  const line = [
    { lat: 48.85, lng: 2.3 },
    { lat: 48.85, lng: 2.4 },
  ];

  it('is false on the road and true a kilometre away', () => {
    expect(isOffRoute({ lat: 48.85, lng: 2.35 }, line, 0.15)).toBe(false);
    expect(isOffRoute({ lat: 48.87, lng: 2.35 }, line, 0.15)).toBe(true);
  });
});

describe('pointAlongKm', () => {
  const line = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
  ];

  it('interpolates inside a segment and clamps past the ends', () => {
    const halfway = haversineKm(line[0], line[1]) / 2;
    const point = pointAlongKm(line, halfway);
    expect(point.lng).toBeCloseTo(0.5, 1);
    expect(pointAlongKm(line, -5)).toEqual(line[0]);
    expect(pointAlongKm(line, 10_000).lng).toBeCloseTo(1, 5);
  });

  it('rejects an empty line', () => {
    expect(() => pointAlongKm([], 1)).toThrow(RangeError);
  });
});

describe('nearestVertex and remainingDistanceKm', () => {
  const line = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 0, lng: 2 },
  ];

  it('picks the closest vertex', () => {
    expect(nearestVertex({ lat: 0.1, lng: 1.05 }, line)).toBe(1);
  });

  it('measures what is left after the nearest vertex', () => {
    const remaining = remainingDistanceKm({ lat: 0, lng: 1 }, line);
    expect(remaining).toBeCloseTo(haversineKm(line[1], line[2]), 6);
    expect(remainingDistanceKm({ lat: 0, lng: 0 }, [])).toBe(0);
  });
});
