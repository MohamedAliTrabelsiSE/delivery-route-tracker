import { apiBase } from '../config';
import type { NavigationLeg, Place, Tour, TrackingSnapshot } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function getTour(id: string): Promise<Tour> {
  return request(`/tours/${encodeURIComponent(id)}`);
}

export function optimizeTour(id: string): Promise<Tour> {
  return request(`/tours/${encodeURIComponent(id)}/optimize`, { method: 'POST' });
}

export function reverseTour(id: string): Promise<Tour> {
  return request(`/tours/${encodeURIComponent(id)}/reverse`, { method: 'POST' });
}

export function recalculateTour(id: string): Promise<Tour> {
  return request(`/tours/${encodeURIComponent(id)}/recalculate`, { method: 'POST' });
}

export function getNavigation(
  tourId: string,
  stopId: string,
  origin?: { lat: number; lng: number },
): Promise<NavigationLeg> {
  const params = new URLSearchParams({ stopId });
  if (origin) {
    params.set('originLat', String(origin.lat));
    params.set('originLng', String(origin.lng));
  }
  return request(`/tours/${encodeURIComponent(tourId)}/navigation?${params.toString()}`);
}

export function getTracking(code: string): Promise<TrackingSnapshot> {
  return request(`/tracking/${encodeURIComponent(code)}`);
}

export function setDropoff(
  code: string,
  body: { lat: number; lng: number; label?: string },
): Promise<TrackingSnapshot> {
  return request(`/tracking/${encodeURIComponent(code)}/location`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function searchPlaces(query: string, limit = 5): Promise<{ results: Place[] }> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return request(`/geocode/search?${params.toString()}`);
}

export function reverseGeocode(lat: number, lng: number): Promise<{ result: Place | null }> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  return request(`/geocode/reverse?${params.toString()}`);
}

export function postPosition(
  driverId: string,
  body: { lat: number; lng: number; heading?: number },
): Promise<{ accepted: boolean; reason?: string }> {
  return request(`/drivers/${encodeURIComponent(driverId)}/position`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
