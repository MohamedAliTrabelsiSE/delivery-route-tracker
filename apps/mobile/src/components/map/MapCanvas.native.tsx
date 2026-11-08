import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, Polyline, UrlTile } from 'react-native-maps';
import type { MapCanvasProps, MapMarker } from './types';

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const PIN: Record<string, string> = {
  stop: '#0f766e',
  driver: '#0f766e',
  destination: '#1d4ed8',
  pin: '#b91c1c',
};

function withAlpha(color: string, alpha: string): string {
  return color.length === 7 ? `${color}${alpha}` : color;
}

function PinGlyph({ marker }: { marker: MapMarker }) {
  if (marker.kind === 'driver') {
    return (
      <View style={[styles.arrowWrap, { transform: [{ rotate: `${marker.heading ?? 0}deg` }] }]}>
        <View style={styles.arrow} />
      </View>
    );
  }
  return (
    <View style={[styles.pin, { backgroundColor: PIN[marker.kind] ?? PIN.stop }]}>
      <Text style={styles.pinText}>{marker.label ?? ''}</Text>
    </View>
  );
}

/** Native map: no Google key. The base map is hidden and OpenStreetMap tiles are drawn on top. */
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
  const mapRef = useRef<MapView>(null);
  const followLat = follow?.lat;
  const followLng = follow?.lng;
  const initial = region ?? {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  useEffect(() => {
    if (followLat === undefined || followLng === undefined) return;
    mapRef.current?.animateToRegion(
      {
        latitude: followLat,
        longitude: followLng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      700,
    );
  }, [followLat, followLng]);

  return (
    <MapView
      ref={mapRef}
      testID={testID}
      style={styles.map}
      mapType="none"
      initialRegion={initial}
      region={follow ? undefined : region}
      onPress={(event) =>
        onPress?.({
          lat: event.nativeEvent.coordinate.latitude,
          lng: event.nativeEvent.coordinate.longitude,
        })
      }
    >
      <UrlTile urlTemplate={OSM_TILES} maximumZ={19} flipY={false} />
      {polygons.map((polygon) => (
        <Polygon
          key={polygon.id}
          coordinates={polygon.coordinates.map((point) => ({
            latitude: point.lat,
            longitude: point.lng,
          }))}
          strokeColor={polygon.color ?? '#1d4ed8'}
          fillColor={withAlpha(polygon.color ?? '#1d4ed8', '1a')}
          strokeWidth={2}
        />
      ))}
      {circles.map((circle) => (
        <Circle
          key={circle.id}
          center={{ latitude: circle.lat, longitude: circle.lng }}
          radius={circle.radiusKm * 1000}
          strokeColor={circle.color ?? '#0f766e'}
          fillColor={withAlpha(circle.color ?? '#0f766e', '26')}
          strokeWidth={2}
        />
      ))}
      {polylines.map((line) => (
        <Polyline
          key={line.id}
          coordinates={line.coordinates.map((point) => ({
            latitude: point.lat,
            longitude: point.lng,
          }))}
          strokeColor={line.color ?? '#1d4ed8'}
          strokeWidth={5}
        />
      ))}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.lat, longitude: marker.lng }}
          title={marker.title}
          anchor={{ x: 0.5, y: 0.5 }}
          draggable={marker.draggable}
          onDragEnd={(event) =>
            onDragEnd?.(marker.id, {
              lat: event.nativeEvent.coordinate.latitude,
              lng: event.nativeEvent.coordinate.longitude,
            })
          }
        >
          <PinGlyph marker={marker} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  pin: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pinText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  arrowWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0f766e',
  },
});
