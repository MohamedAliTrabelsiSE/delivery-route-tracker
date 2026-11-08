import { decodePolyline, regionFromPoints } from '@tracker/geo';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import {
  Button,
  Card,
  Chip,
  Note,
  ProgressBar,
  Screen,
  Title,
  colors,
  layout,
} from '../components/ui';
import { useLiveDriver } from '../hooks/useLiveDriver';
import { getTracking } from '../services/api';
import { useAppStore } from '../store';
import type { TrackingSnapshot } from '../types';

export function TrackScreen() {
  const stored = useAppStore((state) => state.trackingCode);
  const setStored = useAppStore((state) => state.setTrackingCode);
  const [draft, setDraft] = useState(stored);
  const [active, setActive] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TrackingSnapshot | null>(null);
  const [baselineKm, setBaselineKm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = useLiveDriver(active ? { trackingCode: active } : null);

  async function follow(): Promise<void> {
    const code = draft.trim();
    if (!code) return;
    setError(null);
    try {
      const next = await getTracking(code);
      setSnapshot(next);
      setBaselineKm(next.distanceKm);
      setActive(code);
      setStored(code);
    } catch (caught) {
      setSnapshot(null);
      setBaselineKm(null);
      setActive(null);
      setError(caught instanceof Error ? caught.message : 'Tracking failed');
    }
  }

  const driver = live.driver ?? snapshot?.driver ?? null;
  const eta =
    live.eta ?? (snapshot ? { etaMin: snapshot.etaMin, distanceKm: snapshot.distanceKm } : null);
  const line = decodePolyline(snapshot?.polyline ?? '');
  const points = [
    ...(driver ? [{ lat: driver.lat, lng: driver.lng }] : []),
    ...(snapshot ? [snapshot.destination] : []),
    ...line,
  ];
  const region = points.length > 0 ? regionFromPoints(points) : undefined;
  const statusLabel = !active ? 'idle' : live.status === 'open' ? 'live' : live.status;
  const notice = [...live.geofences].reverse().find((event) => event.trackingCode === active);
  const arriving = notice?.type === 'enter';
  const currentKm = eta?.distanceKm ?? null;
  const progress =
    baselineKm && currentKm !== null && baselineKm > 0
      ? Math.min(1, Math.max(0, 1 - currentKm / baselineKm))
      : 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={layout.scroll}>
        <Title>Track a parcel</Title>
        <TextInput
          testID="tracking-input"
          value={draft}
          autoCapitalize="characters"
          onChangeText={setDraft}
          placeholder="Tracking code"
          placeholderTextColor={colors.muted}
          style={layout.field}
        />
        <Button label="Follow" testID="follow-button" onPress={() => void follow()} />
        {error ? <Text style={layout.error}>{error}</Text> : null}
        <View style={layout.row}>
          <View
            style={{
              backgroundColor: colors.accentSoft,
              borderRadius: 99,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text testID="connection-pill" style={{ color: colors.accent, fontWeight: '800' }}>
              {statusLabel}
            </Text>
          </View>
          {eta ? <Chip label={`${eta.etaMin} min away`} /> : null}
        </View>
        {arriving ? (
          <Card>
            <Text style={{ color: colors.warn, fontWeight: '800', fontSize: 16 }}>
              Driver is arriving
            </Text>
            <Note>The driver is inside this drop-off's geofence.</Note>
          </Card>
        ) : null}
        <Card testID="eta-card">
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            {snapshot?.label ?? 'No parcel yet'}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
            {eta ? `${eta.etaMin} min · ${eta.distanceKm} km` : 'ETA pending'}
          </Text>
          {active ? <ProgressBar value={progress} /> : null}
          <Text testID="driver-position" style={{ color: colors.muted }}>
            {driver ? `${driver.lat.toFixed(5)}, ${driver.lng.toFixed(5)}` : 'waiting'}
          </Text>
        </Card>
        <View style={layout.map}>
          <MapCanvas
            region={region}
            follow={driver ? { lat: driver.lat, lng: driver.lng } : undefined}
            polylines={
              line.length > 1 ? [{ id: 'remaining', coordinates: line, color: '#1d4ed8' }] : []
            }
            circles={
              snapshot?.geofenceRadiusKm
                ? [
                    {
                      id: 'destination-fence',
                      lat: snapshot.destination.lat,
                      lng: snapshot.destination.lng,
                      radiusKm: snapshot.geofenceRadiusKm,
                      color: arriving ? colors.warn : colors.accent,
                    },
                  ]
                : []
            }
            markers={[
              ...(snapshot
                ? [
                    {
                      id: 'destination',
                      lat: snapshot.destination.lat,
                      lng: snapshot.destination.lng,
                      title: snapshot.label,
                      kind: 'destination' as const,
                      label: '•',
                    },
                  ]
                : []),
              ...(driver
                ? [
                    {
                      id: 'driver',
                      lat: driver.lat,
                      lng: driver.lng,
                      title: 'Driver',
                      kind: 'driver' as const,
                      heading: driver.heading,
                    },
                  ]
                : []),
            ]}
          />
        </View>
        <Note>Map data © OpenStreetMap contributors</Note>
      </ScrollView>
    </Screen>
  );
}
