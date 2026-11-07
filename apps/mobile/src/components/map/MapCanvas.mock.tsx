import { Text, View } from 'react-native';
import type { MapCanvasProps } from './types';

/** Stand-in used by component tests so neither map library has to load. */
export function MapCanvas({ markers, testID = 'map-canvas' }: MapCanvasProps) {
  return (
    <View testID={testID}>
      {markers.map((marker) => (
        <Text key={marker.id} testID={`marker-${marker.kind}-${marker.id}`}>
          {marker.title ?? marker.id}
        </Text>
      ))}
    </View>
  );
}
