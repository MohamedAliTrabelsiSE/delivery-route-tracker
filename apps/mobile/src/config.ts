export const DEMO_TOUR_ID = 'tour-paris';
export const DEMO_DRIVER_ID = 'driver-1';
export const DEFAULT_TRACKING_CODE = 'TRK-1001';
export const DEPOT = { lat: 48.8566, lng: 2.3522 };
export const OFF_ROUTE_KM = 0.15;

export function apiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  return (configured && configured.length > 0 ? configured : 'http://localhost:3000').replace(/\/$/, '');
}

export function liveUrl(base = apiBase()): string {
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/live';
  url.search = '';
  url.hash = '';
  return url.toString();
}
