import { divIcon } from 'leaflet';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { MapCanvasProps } from './types';

const COLORS: Record<string, string> = {
  stop: '#ea580c',
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

function Fit({ region }: { region?: MapCanvasProps['region'] }) {
  const map = useMap();
  const latitude = region?.latitude;
  const longitude = region?.longitude;
  const latitudeDelta = region?.latitudeDelta;
  const longitudeDelta = region?.longitudeDelta;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
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
  }, [map, latitude, longitude, latitudeDelta, longitudeDelta]);
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

const pinIcon = divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:9px;background:#b91c1c;border:2px solid #fff"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Web map. Markers are drawn without Leaflet's default image URLs. */
export function MapCanvas({ markers, polylines, region, onPress, onDragEnd, testID }: MapCanvasProps) {
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
        <Fit region={region} />
        <Clicks onPress={onPress} />
        {polylines.map((line) => (
          <Polyline
            key={line.id}
            pathOptions={{ color: line.color ?? '#1d4ed8', weight: 4 }}
            positions={line.coordinates.map((point) => [point.lat, point.lng] as [number, number])}
          />
        ))}
        {markers.map((marker) =>
          marker.draggable ? (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              draggable
              icon={pinIcon}
              eventHandlers={{
                dragend: (event) => {
                  const target = event.target as { getLatLng: () => { lat: number; lng: number } };
                  const point = target.getLatLng();
                  onDragEnd?.(marker.id, { lat: point.lat, lng: point.lng });
                },
              }}
            />
          ) : (
            <CircleMarker
              key={marker.id}
              center={[marker.lat, marker.lng]}
              radius={marker.kind === 'driver' ? 10 : 8}
              pathOptions={{
                color: COLORS[marker.kind] ?? COLORS.stop,
                fillColor: COLORS[marker.kind] ?? COLORS.stop,
                fillOpacity: 0.95,
              }}
            />
          ),
        )}
      </MapContainer>
    </div>
  );
}
