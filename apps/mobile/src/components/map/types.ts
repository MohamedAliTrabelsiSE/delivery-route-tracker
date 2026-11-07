import type { MapRegion } from '@tracker/geo';

export type MarkerKind = 'stop' | 'driver' | 'destination' | 'pin';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  kind: MarkerKind;
  draggable?: boolean;
}

export interface MapPolyline {
  id: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
}

export interface MapCanvasProps {
  markers: MapMarker[];
  polylines: MapPolyline[];
  region?: MapRegion;
  onPress?: (point: { lat: number; lng: number }) => void;
  onDragEnd?: (id: string, point: { lat: number; lng: number }) => void;
  testID?: string;
}
