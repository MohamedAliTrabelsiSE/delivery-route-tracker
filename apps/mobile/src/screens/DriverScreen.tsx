import { decodePolyline, regionFromPoints } from '@tracker/geo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Button, colors } from '../components/ui';
import { DEMO_DRIVER_ID, DEMO_TOUR_ID } from '../config';
import { useLiveDriver } from '../hooks/useLiveDriver';
import { useTour } from '../hooks/useTour';
import { postPosition } from '../services/api';
import { useAppStore } from '../store';

export function DriverScreen() {
  const router = useRouter();
  const { tour, isLoading, error, optimize, reverse, recalculate, busy } = useTour(DEMO_TOUR_ID);
  const live = useLiveDriver({ tourId: DEMO_TOUR_ID });
  const sharing = useAppStore((state) => state.sharingGps);
  const setSharing = useAppStore((state) => state.setSharingGps);
  const watch = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => watch.current?.remove(), []);

  const line = decodePolyline(live.routePolyline ?? tour?.route?.polyline ?? '');
  const region = tour ? regionFromPoints(tour.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))) : undefined;
  const nextStop = tour?.stops.find((stop) => stop.kind === 'dropoff');

  async function toggleShare(): Promise<void> {
    if (sharing) {
      watch.current?.remove();
      watch.current = null;
      setSharing(false);
      return;
    }
    if (Platform.OS === 'web') {
      setSharing(true);
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return;
    watch.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 8 },
      (position) => {
        const heading = position.coords.heading;
        void postPosition(DEMO_DRIVER_ID, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: typeof heading === 'number' && heading >= 0 ? heading : undefined,
        });
      },
    );
    setSharing(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{tour?.name ?? 'Driver tour'}</Text>
      <Text style={styles.note}>Map data © OpenStreetMap contributors</Text>
      <View style={styles.map}>
        <MapCanvas
          region={region}
          polylines={line.length > 1 ? [{ id: 'route', coordinates: line }] : []}
          markers={[
            ...(tour?.stops ?? []).map((stop) => ({
              id: stop.id,
              lat: stop.lat,
              lng: stop.lng,
              title: stop.name,
              kind: 'stop' as const,
            })),
            ...(live.driver
              ? [{ id: 'driver', lat: live.driver.lat, lng: live.driver.lng, title: 'Driver', kind: 'driver' as const }]
              : []),
          ]}
        />
      </View>
      <View style={styles.row}>
        <Button label="Optimize" testID="optimize-button" disabled={busy || !tour} onPress={() => void optimize()} />
        <Button label="Reverse" testID="reverse-button" disabled={busy || !tour} onPress={() => void reverse()} />
        <Button
          label="Recalculate"
          testID="recalculate-button"
          disabled={busy || !tour}
          onPress={() => void recalculate()}
        />
      </View>
      <View style={styles.row}>
        <Button label={sharing ? 'Stop GPS' : 'Share GPS'} testID="share-gps-button" onPress={() => void toggleShare()} />
        <Button
          label="Navigate"
          testID="navigate-button"
          disabled={!nextStop}
          onPress={() => nextStop && router.push(`/navigate?stopId=${nextStop.id}`)}
        />
      </View>
      {sharing && Platform.OS === 'web' ? (
        <Text testID="share-status" style={styles.note}>
          On the web the server simulator moves the driver.
        </Text>
      ) : null}
      {isLoading ? <Text>Loading the tour…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View testID="stop-list" style={styles.list}>
        {tour?.stops.map((stop, index) => (
          <Text key={stop.id} testID={`stop-${stop.id}`} style={styles.stop}>
            {index + 1}. {stop.name}
            {stop.trackingCode ? ` · ${stop.trackingCode}` : ''}
          </Text>
        ))}
      </View>
      {tour?.route ? (
        <Text style={styles.note}>
          {tour.route.distanceKm.toFixed(1)} km · {tour.route.durationMin.toFixed(0)} min
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  note: { color: colors.muted },
  error: { color: colors.danger },
  map: { height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#dbe4ee' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 4 },
  stop: { color: colors.text, fontSize: 15 },
});
