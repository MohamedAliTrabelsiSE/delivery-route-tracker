import { regionFromPoints } from '@tracker/geo';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Button, colors } from '../components/ui';
import { DEFAULT_TRACKING_CODE, DEPOT } from '../config';
import { reverseGeocode, searchPlaces, setDropoff } from '../services/api';
import type { Place } from '../types';

export function PickScreen() {
  const [query, setQuery] = useState('');
  const [code, setCode] = useState(DEFAULT_TRACKING_CODE);
  const [pin, setPin] = useState(DEPOT);
  const [label, setLabel] = useState('Drag the pin or search for an address');
  const [results, setResults] = useState<Place[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function apply(point: { lat: number; lng: number }, nextLabel?: string): Promise<void> {
    setPin(point);
    if (nextLabel) {
      setLabel(nextLabel);
      return;
    }
    const response = await reverseGeocode(point.lat, point.lng);
    setLabel(response.result?.label ?? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
  }

  async function search(): Promise<void> {
    setMessage(null);
    const response = await searchPlaces(query.trim());
    setResults(response.results);
    if (response.results[0]) await apply(response.results[0], response.results[0].label);
    else setLabel('No matches');
  }

  async function useMyLocation(): Promise<void> {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Location permission was denied');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    await apply({ lat: position.coords.latitude, lng: position.coords.longitude });
  }

  async function save(): Promise<void> {
    setMessage(null);
    try {
      const saved = await setDropoff(code.trim(), { lat: pin.lat, lng: pin.lng, label });
      setMessage(`Saved for ${saved.code}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not save');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Drop-off pin</Text>
      <TextInput
        testID="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Search an address"
        style={styles.input}
      />
      <View style={styles.row}>
        <Button label="Search" testID="search-button" onPress={() => void search()} />
        <Button label="My location" testID="my-location-button" onPress={() => void useMyLocation()} />
      </View>
      <Text testID="address-label" style={styles.label}>
        {label}
      </Text>
      <View style={styles.map}>
        <MapCanvas
          region={regionFromPoints([pin])}
          polylines={[]}
          markers={[{ id: 'pin', lat: pin.lat, lng: pin.lng, title: label, kind: 'pin', draggable: true }]}
          onPress={(point) => void apply(point)}
          onDragEnd={(_id, point) => void apply(point)}
        />
      </View>
      <Text style={styles.note}>Map data © OpenStreetMap contributors</Text>
      {results.map((place) => (
        <Text key={`${place.lat},${place.lng}`} style={styles.note}>
          {place.label}
        </Text>
      ))}
      <TextInput
        testID="save-code"
        value={code}
        autoCapitalize="characters"
        onChangeText={setCode}
        placeholder="Tracking code"
        style={styles.input}
      />
      <Button label="Save pin" testID="save-button" onPress={() => void save()} />
      {message ? <Text testID="save-message">{message}</Text> : null}
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
  row: { flexDirection: 'row', gap: 8 },
  label: { fontSize: 16, fontWeight: '600', color: colors.text },
  note: { color: colors.muted },
  map: { height: 320, borderRadius: 12, overflow: 'hidden', backgroundColor: '#dbe4ee' },
});
