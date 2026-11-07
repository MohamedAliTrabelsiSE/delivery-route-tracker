import { useEffect, useRef, useState } from 'react';
import { liveUrl } from '../config';
import { startLiveSession, type ConnectionStatus, type LiveSocket } from '../services/live';
import type { DriverFix } from '../types';

export interface LiveTarget {
  tourId?: string;
  trackingCode?: string;
}

export interface EtaUpdate {
  etaMin: number;
  distanceKm: number;
}

export function useLiveDriver(
  target: LiveTarget | null,
  options?: { socketFactory?: (url: string) => LiveSocket; url?: string },
) {
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [driver, setDriver] = useState<DriverFix | null>(null);
  const [eta, setEta] = useState<EtaUpdate | null>(null);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);

  const tourId = target?.tourId;
  const trackingCode = target?.trackingCode;
  const url = options?.url;
  const factoryRef = useRef(options?.socketFactory);
  factoryRef.current = options?.socketFactory;

  useEffect(() => {
    if (!tourId && !trackingCode) {
      setStatus('closed');
      return;
    }
    const session = startLiveSession({
      url: url ?? liveUrl(),
      subscribe: { tourId, trackingCode },
      onStatus: setStatus,
      socketFactory: factoryRef.current,
      onEvent: (frame) => {
        if (frame.event === 'driver_position') setDriver(frame.data as DriverFix);
        if (frame.event === 'eta_updated') {
          const data = frame.data as EtaUpdate & { trackingCode?: string };
          if (!trackingCode || data.trackingCode === trackingCode) {
            setEta({ etaMin: data.etaMin, distanceKm: data.distanceKm });
          }
        }
        if (frame.event === 'route_updated') {
          setRoutePolyline((frame.data as { polyline?: string }).polyline ?? null);
        }
      },
    });
    return () => session.close();
  }, [tourId, trackingCode, url]);

  return { status, driver, eta, routePolyline };
}
