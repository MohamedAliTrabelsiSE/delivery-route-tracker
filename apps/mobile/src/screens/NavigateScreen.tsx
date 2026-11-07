import { decodePolyline, navigationProgress, regionFromPoints } from '@tracker/geo';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Button, Card, colors } from '../components/ui';
import { DEMO_TOUR_ID, DEPOT } from '../config';
import { useOffRoute } from '../hooks/useOffRoute';
import { getNavigation } from '../services/api';
import type { NavigationLeg } from '../types';

const REROUTE_DELAY_MS = 4000;

export function NavigateScreen({
  stopId: stopIdProp,
  origin = DEPOT,
}: {
  stopId?: string;
  origin?: { lat: number; lng: number };
}) {
  const params = useLocalSearchParams<{ stopId?: string }>();
  const stopId = stopIdProp ?? params.stopId ?? '';
  const [leg, setLeg] = useState<NavigationLeg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offRoute = useOffRoute(origin, leg?.polyline);

  const load = useCallback(async () => {
    if (!stopId) return;
    try {
      setLeg(await getNavigation(DEMO_TOUR_ID, stopId, origin));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Navigation failed');
    }
  }, [origin, stopId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!offRoute) return;
    const timer = setTimeout(() => void load(), REROUTE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [offRoute, load]);

  const line = decodePolyline(leg?.polyline ?? '');
  const steps = (leg?.steps ?? []).map((step) => ({
    instruction: step.instruction,
    distanceKm: step.distanceKm,
    location: { lat: step.lat, lng: step.lng },
  }));
  const progress = leg ? navigationProgress(origin, steps, line) : null;
  const step = progress ? steps[progress.stepIndex] : undefined;
  const destination = line[line.length - 1];

  function openExternal(): void {
    if (!destination) return;
    const route = `${origin.lat},${origin.lng};${destination.lat},${destination.lng}`;
    void Linking.openURL(
      `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`,
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>To {stopId || 'stop'}</Text>
      <View style={styles.map}>
        <MapCanvas
          region={line.length > 0 ? regionFromPoints([origin, ...line]) : undefined}
          polylines={line.length > 1 ? [{ id: 'leg', coordinates: line }] : []}
          markers={[
            { id: 'origin', lat: origin.lat, lng: origin.lng, title: 'You', kind: 'driver' },
            ...(destination
              ? [{ id: 'end', lat: destination.lat, lng: destination.lng, title: stopId, kind: 'destination' as const }]
              : []),
          ]}
        />
      </View>
      <Card>
        <Text testID="nav-step" style={styles.step}>
          {step?.instruction ?? 'Loading the leg…'}
        </Text>
        <Text style={styles.note}>
          {progress ? `${progress.remainingKm.toFixed(1)} km left` : ''}
          {leg ? ` · ${leg.durationMin.toFixed(0)} min` : ''}
        </Text>
        {offRoute ? (
          <Text testID="off-route" style={styles.warn}>
            Off the route. Recalculating shortly.
          </Text>
        ) : null}
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Button label="Recalculate" testID="reroute-button" onPress={() => void load()} />
        <Button label="Open in maps" testID="external-maps-button" onPress={openExternal} />
      </View>
      <Text style={styles.note}>Map data © OpenStreetMap contributors</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  map: { height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#dbe4ee' },
  step: { fontSize: 18, fontWeight: '700', color: colors.text },
  note: { color: colors.muted },
  warn: { color: colors.warn, fontWeight: '600' },
  error: { color: colors.danger },
  row: { flexDirection: 'row', gap: 8 },
});
