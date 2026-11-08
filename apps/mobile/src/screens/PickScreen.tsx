import { pointInPolygon, regionFromPoints } from '@tracker/geo';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { MapCanvas } from '../components/map/MapCanvas';
import { Button, Note, Screen, Title, colors, layout } from '../components/ui';
import { DEFAULT_TRACKING_CODE, DEMO_TOUR_ID, DEPOT } from '../config';
import { getTour, reverseGeocode, searchPlaces, setDropoff } from '../services/api';
import type { Place } from '../types';

export function PickScreen() {
  const [query, setQuery] = useState('');
  const [code, setCode] = useState(DEFAULT_TRACKING_CODE);
  const [pin, setPin] = useState(DEPOT);
  const [label, setLabel] = useState('Drag the pin or search for an address');
  const [results, setResults] = useState<Place[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [zone, setZone] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    void Promise.resolve(getTour(DEMO_TOUR_ID))
      .then((tour) => {
        if (tour?.deliveryZone && tour.deliveryZone.length > 2) setZone(tour.deliveryZone);
      })
      .catch(() => undefined);
  }, []);

  const outside = zone.length > 2 && !pointInPolygon(pin, zone);
  const framed = zone.length > 2 ? [pin, ...zone] : [pin];

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
    <Screen>
      <ScrollView contentContainerStyle={layout.scroll}>
        <Title>Drop-off pin</Title>
        <TextInput
          testID="search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search an address"
          placeholderTextColor={colors.muted}
          style={layout.field}
        />
        <View style={layout.row}>
          <Button label="Search" testID="search-button" onPress={() => void search()} />
          <Button
            label="My location"
            testID="my-location-button"
            onPress={() => void useMyLocation()}
          />
        </View>
        <Text
          testID="address-label"
          style={{ fontSize: 16, fontWeight: '700', color: colors.text }}
        >
          {label}
        </Text>
        {outside ? (
          <Text testID="zone-warning" style={layout.warn}>
            Outside the delivery zone
          </Text>
        ) : null}
        <View style={layout.map}>
          <MapCanvas
            region={regionFromPoints(framed)}
            polylines={[]}
            polygons={zone.length > 2 ? [{ id: 'zone', coordinates: zone, color: '#1d4ed8' }] : []}
            markers={[
              { id: 'pin', lat: pin.lat, lng: pin.lng, title: label, kind: 'pin', draggable: true },
            ]}
            onPress={(point) => void apply(point)}
            onDragEnd={(_id, point) => void apply(point)}
          />
        </View>
        <Note>Map data © OpenStreetMap contributors</Note>
        {results.map((place) => (
          <Note key={`${place.lat},${place.lng}`}>{place.label}</Note>
        ))}
        <TextInput
          testID="save-code"
          value={code}
          autoCapitalize="characters"
          onChangeText={setCode}
          placeholder="Tracking code"
          placeholderTextColor={colors.muted}
          style={layout.field}
        />
        <Button label="Save pin" testID="save-button" onPress={() => void save()} />
        {message ? <Text testID="save-message">{message}</Text> : null}
      </ScrollView>
    </Screen>
  );
}
