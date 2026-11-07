import { decodePolyline, isOffRoute } from '@tracker/geo';
import { useMemo } from 'react';
import type { LatLng } from '@tracker/geo';
import { OFF_ROUTE_KM } from '../config';

export function useOffRoute(
  position: LatLng | null,
  polyline: string | null | undefined,
  thresholdKm = OFF_ROUTE_KM,
): boolean {
  return useMemo(() => {
    if (!position || !polyline) return false;
    return isOffRoute(position, decodePolyline(polyline), thresholdKm);
  }, [position, polyline, thresholdKm]);
}
