import { create } from 'zustand';
import { DEFAULT_TRACKING_CODE } from './config';

interface AppState {
  trackingCode: string;
  setTrackingCode: (code: string) => void;
  sharingGps: boolean;
  setSharingGps: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  trackingCode: DEFAULT_TRACKING_CODE,
  setTrackingCode: (trackingCode) => set({ trackingCode }),
  sharingGps: false,
  setSharingGps: (sharingGps) => set({ sharingGps }),
}));
