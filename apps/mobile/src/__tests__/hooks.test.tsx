import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { encodePolyline } from '@tracker/geo';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useLiveDriver } from '../hooks/useLiveDriver';
import { useOffRoute } from '../hooks/useOffRoute';
import { useTour } from '../hooks/useTour';
import { getTour, optimizeTour } from '../services/api';
import type { LiveSocket } from '../services/live';
import type { Tour } from '../types';

jest.mock('../services/api', () => ({
  getTour: jest.fn(),
  optimizeTour: jest.fn(),
  reverseTour: jest.fn(),
  recalculateTour: jest.fn(),
}));

class FakeSocket implements LiveSocket {
  sent: string[] = [];
  private readonly listeners: Record<string, Array<(event: { data?: string }) => void>> = {};

  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (event: { data?: string }) => void): void {
    (this.listeners[type] ??= []).push(listener);
  }

  removeEventListener(): void {
    return undefined;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    return undefined;
  }

  emit(type: 'open' | 'message', event: { data?: string } = {}): void {
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

const tour: Tour = {
  id: 'tour-paris',
  name: 'Paris morning round',
  driverId: 'driver-1',
  route: null,
  stops: [
    { id: 'depot', name: 'Central Depot', lat: 48.85, lng: 2.35, trackingCode: null, kind: 'depot', status: 'pending' },
    { id: 'eiffel', name: 'Eiffel Tower', lat: 48.85, lng: 2.29, trackingCode: 'TRK-1002', kind: 'dropoff', status: 'pending' },
    { id: 'louvre', name: 'Louvre Museum', lat: 48.86, lng: 2.33, trackingCode: 'TRK-1001', kind: 'dropoff', status: 'pending' },
  ],
};

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useTour', () => {
  it('loads a tour and keeps the optimized order', async () => {
    jest.mocked(getTour).mockResolvedValue(tour);
    const optimized = { ...tour, stops: [tour.stops[0], tour.stops[2], tour.stops[1]] };
    jest.mocked(optimizeTour).mockResolvedValue(optimized);
    const { result } = renderHook(() => useTour('tour-paris'), { wrapper });
    await waitFor(() => expect(result.current.tour?.stops[1].id).toBe('eiffel'));
    await act(async () => {
      await result.current.optimize();
    });
    await waitFor(() => expect(result.current.tour?.stops[1].id).toBe('louvre'));
  });

  it('reports a load failure', async () => {
    jest.mocked(getTour).mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTour('tour-paris'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe('offline'));
  });
});

describe('useOffRoute', () => {
  const line = encodePolyline([
    { lat: 48.85, lng: 2.35 },
    { lat: 48.86, lng: 2.35 },
  ]);

  it('is false on the line and true far away', () => {
    const near = renderHook(() => useOffRoute({ lat: 48.855, lng: 2.35 }, line, 0.15));
    const far = renderHook(() => useOffRoute({ lat: 49.2, lng: 2.3 }, line, 0.15));
    const empty = renderHook(() => useOffRoute(null, line));
    expect(near.result.current).toBe(false);
    expect(far.result.current).toBe(true);
    expect(empty.result.current).toBe(false);
  });
});

describe('useLiveDriver', () => {
  it('keeps the driver and the matching ETA', () => {
    const socket = new FakeSocket();
    const { result } = renderHook(() =>
      useLiveDriver({ trackingCode: 'TRK-1001' }, { socketFactory: () => socket, url: 'ws://example/live' }),
    );
    act(() => socket.emit('open'));
    expect(socket.sent[0]).toContain('TRK-1001');
    act(() =>
      socket.emit('message', {
        data: JSON.stringify({
          event: 'driver_position',
          data: { driverId: 'driver-1', tourId: 'tour-paris', lat: 48.86, lng: 2.35, at: 't' },
        }),
      }),
    );
    act(() =>
      socket.emit('message', {
        data: JSON.stringify({ event: 'eta_updated', data: { trackingCode: 'TRK-1001', etaMin: 4, distanceKm: 1.2 } }),
      }),
    );
    act(() =>
      socket.emit('message', {
        data: JSON.stringify({ event: 'eta_updated', data: { trackingCode: 'TRK-1002', etaMin: 9, distanceKm: 3 } }),
      }),
    );
    act(() =>
      socket.emit('message', {
        data: JSON.stringify({ event: 'route_updated', data: { tourId: 'tour-paris', polyline: 'abc' } }),
      }),
    );
    expect(result.current.status).toBe('open');
    expect(result.current.driver?.lat).toBe(48.86);
    expect(result.current.eta).toEqual({ etaMin: 4, distanceKm: 1.2 });
    expect(result.current.routePolyline).toBe('abc');
  });
});
