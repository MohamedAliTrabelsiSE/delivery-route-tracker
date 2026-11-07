export interface Place {
  label: string;
  lat: number;
  lng: number;
}

export interface Geocoder {
  search(query: string, limit: number): Promise<Place[]>;
  reverse(lat: number, lng: number): Promise<Place | null>;
}

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodingError';
  }
}
