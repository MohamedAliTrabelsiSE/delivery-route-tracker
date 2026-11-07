import { DEMO_DRIVER_ID, DEMO_TOUR_ID } from '../config/app-config';
import type { Tour } from './tour.types';

/**
 * One morning round. The stop order is deliberately inefficient so "optimize" has
 * something visible to do. Coordinates are central Paris.
 */
export function seedTour(): Tour {
  return {
    id: DEMO_TOUR_ID,
    name: 'Paris morning round',
    driverId: DEMO_DRIVER_ID,
    route: null,
    stops: [
      { id: 'depot', name: 'Central Depot', lat: 48.8566, lng: 2.3522, trackingCode: null, kind: 'depot', status: 'pending' },
      { id: 'eiffel', name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, trackingCode: 'TRK-1002', kind: 'dropoff', status: 'pending' },
      { id: 'sacre', name: 'Sacre-Coeur', lat: 48.8867, lng: 2.3431, trackingCode: 'TRK-1004', kind: 'dropoff', status: 'pending' },
      { id: 'louvre', name: 'Louvre Museum', lat: 48.8606, lng: 2.3376, trackingCode: 'TRK-1001', kind: 'dropoff', status: 'pending' },
      { id: 'lyon', name: 'Gare de Lyon', lat: 48.8448, lng: 2.3735, trackingCode: 'TRK-1006', kind: 'dropoff', status: 'pending' },
      { id: 'arc', name: 'Arc de Triomphe', lat: 48.8738, lng: 2.295, trackingCode: 'TRK-1003', kind: 'dropoff', status: 'pending' },
      { id: 'bastille', name: 'Place de la Bastille', lat: 48.853, lng: 2.369, trackingCode: 'TRK-1005', kind: 'dropoff', status: 'pending' },
    ],
  };
}
