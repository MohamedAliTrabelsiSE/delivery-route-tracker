import { decodePolyline, regionFromPoints } from '@tracker/geo';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Button, Card, colors } from '../components/ui';
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
  const [error, setError] = useState<string | null>(null);
  const live = useLiveDriver(active ? { trackingCode: active } : null);

  async function follow(): Promise<void> {
    const code = draft.trim();
    if (!code) return;
    setError(null);
    try {
      const next = await getTracking(code);
      setSnapshot(next);
      setActive(code);
      setStored(code);
    } catch (caught) {
      setSnapshot(null);
      setActive(null);
      setError(caught instanceof Error ? caught.message : 'Tracking failed');
    }
  }

  const driver = live.driver ?? snapshot?.driver ?? null;
  const eta = live.eta ?? (snapshot ? { etaMin: snapshot.etaMin, distanceKm: snapshot.distanceKm } : null);
  const line = decodePolyline(snapshot?.polyline ?? '');
  const points = [
    ...(driver ? [{ lat: driver.lat, lng: driver.lng }] : []),
    ...(snapshot ? [snapshot.destination] : []),
    ...line,
  ];
  const region = points.length > 0 ? regionFromPoints(points) : undefined;
  const statusLabel = !active ? 'idle' : live.status === 'open' ? 'live' : live.status;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Track a parcel</Text>
      <TextInput
        testID="tracking-input"
        value={draft}
        autoCapitalize="characters"
        onChangeText={setDraft}
        placeholder="Tracking code"
        style={styles.input}
      />
      <Button label="Follow" testID="follow-button" onPress={() => void follow()} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.pillRow}>
        <Text testID="connection-pill" style={styles.pill}>
          {statusLabel}
        </Text>
      </View>
      <Card testID="eta-card">
        <Text style={styles.label}>{snapshot?.label ?? 'No parcel yet'}</Text>
        <Text style={styles.eta}>{eta ? `${eta.etaMin} min · ${eta.distanceKm} km` : 'ETA pending'}</Text>
        <Text testID="driver-position" style={styles.note}>
          {driver ? `${driver.lat.toFixed(5)}, ${driver.lng.toFixed(5)}` : 'waiting'}
        </Text>
      </Card>
      <View style={styles.map}>
        <MapCanvas
          region={region}
          polylines={line.length > 1 ? [{ id: 'remaining', coordinates: line, color: '#1d4ed8' }] : []}
          markers={[
            ...(snapshot
              ? [
                  {
                    id: 'destination',
                    lat: snapshot.destination.lat,
                    lng: snapshot.destination.lng,
                    title: snapshot.label,
                    kind: 'destination' as const,
                  },
                ]
              : []),
            ...(driver
              ? [{ id: 'driver', lat: driver.lat, lng: driver.lng, title: 'Driver', kind: 'driver' as const }]
              : []),
          ]}
        />
      </View>
      <Text style={styles.note}>Map data © OpenStreetMap contributors</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  input: {
    backgroundColor: '#fff',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  error: { color: colors.danger },
  pillRow: { flexDirection: 'row' },
  pill: {
    overflow: 'hidden',
    backgroundColor: '#ccfbf1',
    color: colors.accent,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  eta: { fontSize: 20, color: colors.text },
  note: { color: colors.muted },
  map: { height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#dbe4ee' },
});
