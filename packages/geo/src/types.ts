export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface NavStep {
  instruction: string;
  distanceKm: number;
  location: LatLng;
}

export interface NavProgress {
  /** Index of the step the traveller is currently on. */
  stepIndex: number;
  /** Kilometres still to cover, from the current position to the end of the route. */
  remainingKm: number;
}
