import { Text, View } from 'react-native';
import type { MapCanvasProps } from './types';

/** Stand-in used by component tests so neither map library has to load. */
export function MapCanvas({
  markers,
  circles = [],
  polygons = [],
  testID = 'map-canvas',
}: MapCanvasProps) {
  return (
    <View testID={testID}>
      {polygons.map((polygon) => (
        <Text key={polygon.id} testID={`polygon-${polygon.id}`}>
          {polygon.coordinates.length}
        </Text>
      ))}
      {circles.map((circle) => (
        <Text key={circle.id} testID={`circle-${circle.id}`}>
          {circle.radiusKm}
        </Text>
      ))}
      {markers.map((marker) => (
        <Text key={marker.id} testID={`marker-${marker.kind}-${marker.id}`}>
          {marker.title ?? marker.id}
        </Text>
      ))}
    </View>
  );
}
