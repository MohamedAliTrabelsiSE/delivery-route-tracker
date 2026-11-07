import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import type { MapCanvasProps } from './types';

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const PIN: Record<string, string> = {
  stop: '#ea580c',
  driver: '#0f766e',
  destination: '#1d4ed8',
  pin: '#b91c1c',
};

/** Native map: no Google key. The base map is hidden and OpenStreetMap tiles are drawn on top. */
export function MapCanvas({ markers, polylines, region, onPress, onDragEnd, testID }: MapCanvasProps) {
  return (
    <MapView
      testID={testID}
      style={styles.map}
      mapType="none"
      initialRegion={
        region ?? { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.08, longitudeDelta: 0.08 }
      }
      region={region}
      onPress={(event) =>
        onPress?.({
          lat: event.nativeEvent.coordinate.latitude,
          lng: event.nativeEvent.coordinate.longitude,
        })
      }
    >
      <UrlTile urlTemplate={OSM_TILES} maximumZ={19} flipY={false} />
      {polylines.map((line) => (
        <Polyline
          key={line.id}
          coordinates={line.coordinates.map((point) => ({ latitude: point.lat, longitude: point.lng }))}
          strokeColor={line.color ?? '#1d4ed8'}
          strokeWidth={4}
        />
      ))}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={{ latitude: marker.lat, longitude: marker.lng }}
          title={marker.title}
          pinColor={PIN[marker.kind] ?? PIN.stop}
          draggable={marker.draggable}
          onDragEnd={(event) =>
            onDragEnd?.(marker.id, {
              lat: event.nativeEvent.coordinate.latitude,
              lng: event.nativeEvent.coordinate.longitude,
            })
          }
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
