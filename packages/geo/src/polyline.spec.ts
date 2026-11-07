import { decodePolyline, encodePolyline } from './polyline';

/** The canonical example from Google's polyline algorithm documentation. */
const GOOGLE_EXAMPLE = [
  { lat: 38.5, lng: -120.2 },
  { lat: 40.7, lng: -120.95 },
  { lat: 43.252, lng: -126.453 },
];
const GOOGLE_ENCODED = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';

describe('polyline', () => {
  it('encodes the documented example', () => {
    expect(encodePolyline(GOOGLE_EXAMPLE)).toBe(GOOGLE_ENCODED);
  });

  it('decodes the documented example', () => {
    const decoded = decodePolyline(GOOGLE_ENCODED);
    decoded.forEach((point, index) => {
      expect(point.lat).toBeCloseTo(GOOGLE_EXAMPLE[index].lat, 5);
      expect(point.lng).toBeCloseTo(GOOGLE_EXAMPLE[index].lng, 5);
    });
  });

  it('round-trips a city route within the precision of five decimals', () => {
    const route = [
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.8606, lng: 2.3376 },
      { lat: 48.8584, lng: 2.2945 },
    ];
    const back = decodePolyline(encodePolyline(route));
    back.forEach((point, index) => {
      expect(point.lat).toBeCloseTo(route[index].lat, 5);
      expect(point.lng).toBeCloseTo(route[index].lng, 5);
    });
  });

  it('round-trips at precision 6', () => {
    const point = [{ lat: 48.85837, lng: 2.294481 }];
    const back = decodePolyline(encodePolyline(point, 6), 6);
    expect(back[0].lat).toBeCloseTo(point[0].lat, 6);
    expect(back[0].lng).toBeCloseTo(point[0].lng, 6);
  });

  it('handles an empty path', () => {
    expect(encodePolyline([])).toBe('');
    expect(decodePolyline('')).toEqual([]);
  });
});
