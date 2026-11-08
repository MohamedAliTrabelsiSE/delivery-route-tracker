import { decodePolyline, navigationProgress, regionFromPoints } from '@tracker/geo';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Badge, Button, Card, Note, Screen, Title, layout } from '../components/ui';
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
    <Screen>
      <ScrollView contentContainerStyle={layout.scroll}>
        <Title>To {stopId ? stopId.charAt(0).toUpperCase() + stopId.slice(1) : 'stop'}</Title>
        <View style={layout.map}>
          <MapCanvas
            region={line.length > 0 ? regionFromPoints([origin, ...line]) : undefined}
            polylines={
              line.length > 1
                ? [{ id: 'leg', coordinates: line, color: offRoute ? '#b45309' : '#1d4ed8' }]
                : []
            }
            markers={[
              {
                id: 'origin',
                lat: origin.lat,
                lng: origin.lng,
                title: 'You',
                kind: 'driver',
                label: 'You',
              },
              ...(destination
                ? [
                    {
                      id: 'end',
                      lat: destination.lat,
                      lng: destination.lng,
                      title: stopId,
                      kind: 'destination' as const,
                      label: 'End',
                    },
                  ]
                : []),
            ]}
          />
        </View>
        <Card>
          <View style={layout.row}>
            <Badge label={offRoute ? 'Rerouting' : 'Next'} tone={offRoute ? 'warn' : 'accent'} />
            {progress ? <Note>{progress.remainingKm.toFixed(1)} km left</Note> : null}
            {leg ? <Note>{leg.durationMin.toFixed(0)} min</Note> : null}
          </View>
          <Text
            testID="nav-step"
            style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 }}
          >
            {step?.instruction ?? 'Loading the leg…'}
          </Text>
          {offRoute ? (
            <Text testID="off-route" style={layout.warn}>
              Off the route. Recalculating shortly.
            </Text>
          ) : (
            <Note>Stay on the highlighted road. The leg refreshes if you leave it.</Note>
          )}
        </Card>
        {error ? <Text style={layout.error}>{error}</Text> : null}
        <View style={layout.row}>
          <Button label="Recalculate" testID="reroute-button" onPress={() => void load()} />
          <Button label="Open in maps" testID="external-maps-button" onPress={openExternal} />
        </View>
        <Note>Map data © OpenStreetMap contributors</Note>
      </ScrollView>
    </Screen>
  );
}
