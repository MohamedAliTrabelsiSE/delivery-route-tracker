import type { MapRegion } from '@tracker/geo';

export type MarkerKind = 'stop' | 'driver' | 'destination' | 'pin';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  kind: MarkerKind;
  draggable?: boolean;
  /** Degrees clockwise from north. Used to point the driver arrow. */
  heading?: number;
  /** Short label drawn inside a numbered pin. */
  label?: string;
}

export interface MapPolyline {
  id: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
}

export interface MapCircle {
  id: string;
  lat: number;
  lng: number;
  radiusKm: number;
  color?: string;
}

export interface MapPolygon {
  id: string;
  coordinates: { lat: number; lng: number }[];
  color?: string;
}

export interface MapCanvasProps {
  markers: MapMarker[];
  polylines: MapPolyline[];
  circles?: MapCircle[];
  polygons?: MapPolygon[];
  region?: MapRegion;
  /** When set, the camera eases toward this point instead of framing `region`. */
  follow?: { lat: number; lng: number };
  onPress?: (point: { lat: number; lng: number }) => void;
  onDragEnd?: (id: string, point: { lat: number; lng: number }) => void;
  testID?: string;
}
