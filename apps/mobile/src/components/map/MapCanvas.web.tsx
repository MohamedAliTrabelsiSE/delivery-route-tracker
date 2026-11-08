import { divIcon, type DivIcon } from 'leaflet';
import { useEffect, useRef } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { MapCanvasProps, MapMarker } from './types';

const COLORS: Record<string, string> = {
  stop: '#0f766e',
  driver: '#0f766e',
  destination: '#1d4ed8',
  pin: '#b91c1c',
};

function ensureLeafletCss(): void {
  if (typeof document === 'undefined' || document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

function withAlpha(color: string): string {
  return color.length === 7 ? `${color}33` : color;
}

function markerIcon(marker: MapMarker): DivIcon {
  if (marker.kind === 'driver') {
    const rotation = marker.heading ?? 0;
    return divIcon({
      className: '',
      html: `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:18px solid #0f766e;transform:rotate(${rotation}deg);filter:drop-shadow(0 1px 1px rgba(15,23,42,.35))"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 12],
    });
  }
  if (marker.draggable) {
    return divIcon({
      className: '',
      html: '<div style="width:18px;height:18px;border-radius:9px;background:#b91c1c;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.35)"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  const color = COLORS[marker.kind] ?? COLORS.stop;
  const label = marker.label ?? '';
  return divIcon({
    className: '',
    html: `<div style="min-width:22px;height:22px;padding:0 4px;border-radius:11px;background:${color};color:#fff;border:2px solid #fff;font:700 11px sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(15,23,42,.3)">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function Camera({
  region,
  follow,
}: {
  region?: MapCanvasProps['region'];
  follow?: MapCanvasProps['follow'];
}) {
  const map = useMap();
  const fitted = useRef(false);
  const latitude = region?.latitude;
  const longitude = region?.longitude;
  const latitudeDelta = region?.latitudeDelta;
  const longitudeDelta = region?.longitudeDelta;
  const followLat = follow?.lat;
  const followLng = follow?.lng;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      if (followLat !== undefined && followLng !== undefined) {
        if (
          !fitted.current &&
          latitude !== undefined &&
          longitude !== undefined &&
          latitudeDelta &&
          longitudeDelta
        ) {
          map.fitBounds(
            [
              [latitude - latitudeDelta / 2, longitude - longitudeDelta / 2],
              [latitude + latitudeDelta / 2, longitude + longitudeDelta / 2],
            ],
            { animate: false },
          );
          fitted.current = true;
        }
        map.panTo([followLat, followLng], { animate: true });
        return;
      }
      if (
        latitude === undefined ||
        longitude === undefined ||
        latitudeDelta === undefined ||
        longitudeDelta === undefined
      ) {
        return;
      }
      const singlePoint = latitudeDelta <= 0.011 && longitudeDelta <= 0.011;
      if (singlePoint) {
        map.setView([latitude, longitude], 15, { animate: false });
        return;
      }
      map.fitBounds(
        [
          [latitude - latitudeDelta / 2, longitude - longitudeDelta / 2],
          [latitude + latitudeDelta / 2, longitude + longitudeDelta / 2],
        ],
        { animate: false },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [map, latitude, longitude, latitudeDelta, longitudeDelta, followLat, followLng]);
  return null;
}

function Clicks({ onPress }: { onPress?: MapCanvasProps['onPress'] }) {
  useMapEvents({
    click(event) {
      onPress?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

/** Web map. Markers are drawn without Leaflet's default image URLs. */
export function MapCanvas({
  markers,
  polylines,
  circles = [],
  polygons = [],
  region,
  follow,
  onPress,
  onDragEnd,
  testID,
}: MapCanvasProps) {
  useEffect(() => {
    ensureLeafletCss();
  }, []);
  const center = region
    ? ([region.latitude, region.longitude] as [number, number])
    : ([48.8566, 2.3522] as [number, number]);

  return (
    <div data-testid={testID ?? 'map-canvas'} style={{ height: '100%', width: '100%' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Camera region={region} follow={follow} />
        <Clicks onPress={onPress} />
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            pathOptions={{
              color: polygon.color ?? '#1d4ed8',
              weight: 2,
              fillColor: polygon.color ?? '#1d4ed8',
              fillOpacity: 0.08,
              dashArray: '6 4',
            }}
            positions={polygon.coordinates.map(
              (point) => [point.lat, point.lng] as [number, number],
            )}
          />
        ))}
        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={[circle.lat, circle.lng]}
            radius={circle.radiusKm * 1000}
            pathOptions={{
              color: circle.color ?? '#0f766e',
              weight: 2,
              fillColor: withAlpha(circle.color ?? '#0f766e'),
              fillOpacity: 0.15,
            }}
          />
        ))}
        {polylines.map((line) => (
          <Polyline
            key={line.id}
            pathOptions={{ color: line.color ?? '#1d4ed8', weight: 5 }}
            positions={line.coordinates.map((point) => [point.lat, point.lng] as [number, number])}
          />
        ))}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            draggable={marker.draggable}
            icon={markerIcon(marker)}
            eventHandlers={{
              dragend: (event) => {
                const target = event.target as { getLatLng: () => { lat: number; lng: number } };
                const point = target.getLatLng();
                onDragEnd?.(marker.id, { lat: point.lat, lng: point.lng });
              },
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
