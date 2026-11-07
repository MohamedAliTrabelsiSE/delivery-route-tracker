import { haversineKm } from '@tracker/geo';
import type { Geocoder, Place } from './geocoder';

interface GazetteerEntry extends Place {
  keys: string[];
}

/** A handful of landmarks so search and reverse geocoding work with no network. */
export const PARIS_GAZETTEER: GazetteerEntry[] = [
  { label: 'Louvre Museum, Paris', lat: 48.8606, lng: 2.3376, keys: ['louvre'] },
  { label: 'Eiffel Tower, Paris', lat: 48.8584, lng: 2.2945, keys: ['eiffel'] },
  { label: 'Arc de Triomphe, Paris', lat: 48.8738, lng: 2.295, keys: ['arc', 'triomphe'] },
  { label: 'Sacre-Coeur, Paris', lat: 48.8867, lng: 2.3431, keys: ['sacre', 'coeur', 'sacré'] },
  { label: 'Place de la Bastille, Paris', lat: 48.853, lng: 2.369, keys: ['bastille'] },
  { label: 'Gare de Lyon, Paris', lat: 48.8448, lng: 2.3735, keys: ['gare', 'lyon'] },
  { label: 'Notre-Dame, Paris', lat: 48.853, lng: 2.3499, keys: ['notre', 'dame'] },
];

const REVERSE_LIMIT_KM = 3;

export class MockGeocoder implements Geocoder {
  constructor(private readonly places: GazetteerEntry[] = PARIS_GAZETTEER) {}

  search(query: string, limit: number): Promise<Place[]> {
    const terms = query.toLowerCase().split(/[^a-z0-9é]+/).filter(Boolean);
    const matches = this.places.filter((place) =>
      terms.some((term) => place.keys.some((key) => key.includes(term) || term.includes(key)) || place.label.toLowerCase().includes(term)),
    );
    return Promise.resolve(matches.slice(0, Math.max(1, limit)).map(strip));
  }

  reverse(lat: number, lng: number): Promise<Place | null> {
    let best: GazetteerEntry | undefined;
    let bestDistance = REVERSE_LIMIT_KM;
    for (const place of this.places) {
      const distance = haversineKm({ lat, lng }, place);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = place;
      }
    }
    return Promise.resolve(best ? strip(best) : { label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
  }
}

function strip(place: GazetteerEntry): Place {
  return { label: place.label, lat: place.lat, lng: place.lng };
}
