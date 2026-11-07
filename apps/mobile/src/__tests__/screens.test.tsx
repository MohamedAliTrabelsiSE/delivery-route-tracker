import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { encodePolyline } from '@tracker/geo';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { DriverScreen } from '../screens/DriverScreen';
import { NavigateScreen } from '../screens/NavigateScreen';
import { PickScreen } from '../screens/PickScreen';
import { TrackScreen } from '../screens/TrackScreen';
import { getNavigation, getTour, getTracking, optimizeTour, postPosition, reverseGeocode, searchPlaces, setDropoff } from '../services/api';
import type { Tour } from '../types';

jest.mock('../services/api', () => ({
  getTour: jest.fn(),
  optimizeTour: jest.fn(),
  reverseTour: jest.fn(),
  recalculateTour: jest.fn(),
  postPosition: jest.fn(),
  getTracking: jest.fn(),
  getNavigation: jest.fn(),
  searchPlaces: jest.fn(),
  reverseGeocode: jest.fn(),
  setDropoff: jest.fn(),
}));

jest.mock('../services/live', () => ({
  startLiveSession: jest.fn(() => ({ close: jest.fn(), send: jest.fn() })),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));

const tour: Tour = {
  id: 'tour-paris',
  name: 'Paris morning round',
  driverId: 'driver-1',
  route: {
    polyline: encodePolyline([
      { lat: 48.8566, lng: 2.3522 },
      { lat: 48.8606, lng: 2.3376 },
    ]),
    distanceKm: 3.2,
    durationMin: 12,
    legs: [],
    stopOrder: ['depot', 'eiffel', 'louvre'],
  },
  stops: [
    { id: 'depot', name: 'Central Depot', lat: 48.8566, lng: 2.3522, trackingCode: null, kind: 'depot', status: 'pending' },
    { id: 'eiffel', name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, trackingCode: 'TRK-1002', kind: 'dropoff', status: 'pending' },
    { id: 'louvre', name: 'Louvre Museum', lat: 48.8606, lng: 2.3376, trackingCode: 'TRK-1001', kind: 'dropoff', status: 'pending' },
  ],
};

function renderScreen(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Driver screen', () => {
  it('optimizes the stop order and shares a GPS fix', async () => {
    jest.mocked(getTour).mockResolvedValue(tour);
    jest.mocked(optimizeTour).mockResolvedValue({
      ...tour,
      stops: [tour.stops[0], tour.stops[2], tour.stops[1]],
    });
    jest.mocked(postPosition).mockResolvedValue({ accepted: true });
    const screen = renderScreen(<DriverScreen />);
    expect(await screen.findByText('2. Eiffel Tower · TRK-1002')).toBeTruthy();
    fireEvent.press(screen.getByTestId('optimize-button'));
    expect(await screen.findByText('2. Louvre Museum · TRK-1001')).toBeTruthy();
    fireEvent.press(screen.getByTestId('share-gps-button'));
    await waitFor(() => expect(postPosition).toHaveBeenCalledWith('driver-1', expect.objectContaining({ lat: 48.86, lng: 2.35 })));
  });
});

describe('Track screen', () => {
  it('shows the ETA and a live driver fix', async () => {
    jest.mocked(getTracking).mockResolvedValue({
      code: 'TRK-1001',
      label: 'Louvre Museum',
      destination: { lat: 48.8606, lng: 2.3376 },
      driver: { lat: 48.85, lng: 2.35, at: 't' },
      polyline: encodePolyline([
        { lat: 48.85, lng: 2.35 },
        { lat: 48.8606, lng: 2.3376 },
      ]),
      etaMin: 6,
      distanceKm: 2.4,
    });
    const screen = renderScreen(<TrackScreen />);
    fireEvent.changeText(screen.getByTestId('tracking-input'), 'TRK-1001');
    fireEvent.press(screen.getByTestId('follow-button'));
    expect(await screen.findByText('6 min · 2.4 km')).toBeTruthy();
    expect(screen.getByTestId('connection-pill')).toBeTruthy();
    expect(screen.getByTestId('driver-position').props.children).toBe('48.85000, 2.35000');
    expect(screen.getByTestId('marker-driver-driver')).toBeTruthy();
  });
});

describe('Pick screen', () => {
  it('searches, labels the pin and saves it', async () => {
    jest.mocked(searchPlaces).mockResolvedValue({
      results: [{ label: 'Louvre Museum, Paris', lat: 48.8606, lng: 2.3376 }],
    });
    jest.mocked(reverseGeocode).mockResolvedValue({ result: { label: 'Near the depot', lat: 48.8566, lng: 2.3522 } });
    jest.mocked(setDropoff).mockResolvedValue({
      code: 'TRK-1001',
      label: 'Louvre Museum, Paris',
      destination: { lat: 48.8606, lng: 2.3376 },
      driver: null,
      polyline: '',
      etaMin: 1,
      distanceKm: 0.2,
    });
    const screen = renderScreen(<PickScreen />);
    fireEvent.changeText(screen.getByTestId('search'), 'louvre');
    fireEvent.press(screen.getByTestId('search-button'));
    expect(await screen.findByTestId('address-label')).toHaveTextContent('Louvre Museum, Paris');
    fireEvent.press(screen.getByTestId('my-location-button'));
    await waitFor(() => expect(reverseGeocode).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('save-button'));
    expect(await screen.findByText('Saved for TRK-1001')).toBeTruthy();
  });
});

describe('Navigate screen', () => {
  it('shows the current step and opens an external map', async () => {
    const linking = jest.requireMock('expo-linking') as { openURL: jest.Mock };
    jest.mocked(getNavigation).mockResolvedValue({
      stopId: 'louvre',
      polyline: encodePolyline([
        { lat: 48.8566, lng: 2.3522 },
        { lat: 48.8606, lng: 2.3376 },
      ]),
      distanceKm: 1.2,
      durationMin: 4,
      steps: [{ instruction: 'Continue to Louvre Museum', distanceKm: 1.2, lat: 48.8606, lng: 2.3376 }],
    });
    const screen = renderScreen(<NavigateScreen />);
    expect(await screen.findByText('Continue to Louvre Museum')).toBeTruthy();
    const before = jest.mocked(getNavigation).mock.calls.length;
    fireEvent.press(screen.getByTestId('reroute-button'));
    await waitFor(() => expect(jest.mocked(getNavigation).mock.calls.length).toBeGreaterThan(before));
    fireEvent.press(screen.getByTestId('external-maps-button'));
    expect(linking.openURL).toHaveBeenCalledWith(expect.stringContaining('openstreetmap.org/directions'));
  });
});
