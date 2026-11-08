import { decodePolyline, regionFromPoints } from '@tracker/geo';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import {
  Badge,
  Button,
  Chip,
  Note,
  Screen,
  Title,
  fenceColor,
  layout,
  statusTone,
} from '../components/ui';
import { DEMO_DRIVER_ID, DEMO_TOUR_ID } from '../config';
import { useLiveDriver } from '../hooks/useLiveDriver';
import { useTour } from '../hooks/useTour';
import { postPosition } from '../services/api';
import { useAppStore } from '../store';
import type { Stop } from '../types';

function statusFor(
  stop: Stop,
  events: { stopId: string; type: 'enter' | 'exit' }[],
): Stop['status'] {
  let status = stop.status;
  for (const event of events) {
    if (event.stopId === stop.id) status = event.type === 'enter' ? 'arriving' : 'arrived';
  }
  return status;
}

export function DriverScreen() {
  const router = useRouter();
  const { tour, isLoading, error, optimize, reverse, recalculate, busy } = useTour(DEMO_TOUR_ID);
  const live = useLiveDriver({ tourId: DEMO_TOUR_ID });
  const sharing = useAppStore((state) => state.sharingGps);
  const setSharing = useAppStore((state) => state.setSharingGps);
  const watch = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => watch.current?.remove(), []);

  const line = decodePolyline(live.routePolyline ?? tour?.route?.polyline ?? '');
  const region = tour
    ? regionFromPoints(tour.stops.map((stop) => ({ lat: stop.lat, lng: stop.lng })))
    : undefined;
  const nextStop = tour?.stops.find(
    (stop) => stop.kind === 'dropoff' && statusFor(stop, live.geofences) !== 'arrived',
  );
  const fallbackStop = tour?.stops.find((stop) => stop.kind === 'dropoff');

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
    <Screen>
      <ScrollView contentContainerStyle={layout.scroll}>
        <Title>{tour?.name ?? 'Driver tour'}</Title>
        <View style={layout.row}>
          <Chip label="Delivery zone" />
          <Chip label="Live route" tone="muted" />
          {live.driver ? <Chip label="Driver moving" tone="ok" /> : null}
        </View>
        <View style={layout.map}>
          <MapCanvas
            region={region}
            polylines={line.length > 1 ? [{ id: 'route', coordinates: line }] : []}
            polygons={
              tour?.deliveryZone && tour.deliveryZone.length > 2
                ? [{ id: 'zone', coordinates: tour.deliveryZone, color: '#1d4ed8' }]
                : []
            }
            circles={(tour?.stops ?? [])
              .filter((stop) => (stop.geofenceRadiusKm ?? 0) > 0)
              .map((stop) => ({
                id: stop.id,
                lat: stop.lat,
                lng: stop.lng,
                radiusKm: stop.geofenceRadiusKm ?? 0,
                color: fenceColor(statusFor(stop, live.geofences)),
              }))}
            markers={[
              ...(tour?.stops ?? []).map((stop, index) => ({
                id: stop.id,
                lat: stop.lat,
                lng: stop.lng,
                title: stop.name,
                kind: 'stop' as const,
                label: String(index + 1),
              })),
              ...(live.driver
                ? [
                    {
                      id: 'driver',
                      lat: live.driver.lat,
                      lng: live.driver.lng,
                      title: 'Driver',
                      kind: 'driver' as const,
                      heading: live.driver.heading,
                    },
                  ]
                : []),
            ]}
          />
        </View>
        <View style={layout.row}>
          <Button
            label="Optimize"
            testID="optimize-button"
            disabled={busy || !tour}
            onPress={() => void optimize()}
          />
          <Button
            label="Reverse"
            testID="reverse-button"
            disabled={busy || !tour}
            onPress={() => void reverse()}
          />
          <Button
            label="Recalculate"
            testID="recalculate-button"
            disabled={busy || !tour}
            onPress={() => void recalculate()}
          />
        </View>
        <View style={layout.row}>
          <Button
            label={sharing ? 'Stop GPS' : 'Share GPS'}
            testID="share-gps-button"
            onPress={() => void toggleShare()}
          />
          <Button
            label="Navigate"
            testID="navigate-button"
            disabled={!nextStop && !fallbackStop}
            onPress={() => {
              const target = nextStop ?? fallbackStop;
              if (target) router.push(`/navigate?stopId=${target.id}`);
            }}
          />
        </View>
        {sharing && Platform.OS === 'web' ? (
          <Text testID="share-status" style={styles.note}>
            On the web the server simulator moves the driver.
          </Text>
        ) : null}
        {isLoading ? <Note>Loading the tour…</Note> : null}
        {error ? <Text style={layout.error}>{error}</Text> : null}
        <View testID="stop-list" style={styles.list}>
          {tour?.stops.map((stop, index) => {
            const status = statusFor(stop, live.geofences);
            return (
              <View key={stop.id} style={styles.stopRow}>
                <Text testID={`stop-${stop.id}`} style={styles.stop}>
                  {index + 1}. {stop.name}
                  {stop.trackingCode ? ` · ${stop.trackingCode}` : ''}
                </Text>
                <Badge label={status} tone={statusTone(status)} />
              </View>
            );
          })}
        </View>
        {tour?.route ? (
          <Note>
            {tour.route.distanceKm.toFixed(1)} km · {tour.route.durationMin.toFixed(0)} min
          </Note>
        ) : null}
        <Note>Map data © OpenStreetMap contributors</Note>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { color: '#64748b' },
  list: { gap: 8 },
  stopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stop: { color: '#0f172a', fontSize: 15, flex: 1 },
});
