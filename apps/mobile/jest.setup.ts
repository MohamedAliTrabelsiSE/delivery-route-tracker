import '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';

onlineManager.setEventListener(() => () => undefined);
focusManager.setEventListener(() => () => undefined);

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ stopId: 'louvre' }),
  Link: ({ children }: { children: unknown }) => children,
  Stack: Object.assign(({ children }: { children: unknown }) => children, {
    Screen: () => null,
  }),
  Tabs: Object.assign(({ children }: { children: unknown }) => children, {
    Screen: () => null,
  }),
}));

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 48.8566, longitude: 2.3522, heading: 0 },
  })),
  watchPositionAsync: jest.fn(async (_options: unknown, callback: (position: unknown) => void) => {
    callback({ coords: { latitude: 48.86, longitude: 2.35, heading: 12 } });
    return { remove: jest.fn() };
  }),
}));
