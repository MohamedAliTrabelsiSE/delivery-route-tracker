import { haversineKm } from '@tracker/geo';
import type { Clock } from '../config/clock';

/** Drops fixes that are both recent and barely any movement, so a noisy GPS does not flood clients. */
export class MovementThrottle {
  private readonly last = new Map<string, { at: number; lat: number; lng: number }>();

  constructor(
    private readonly clock: Clock,
    private readonly minIntervalMs: number,
    private readonly minMoveKm: number,
  ) {}

  allow(id: string, position: { lat: number; lng: number }): boolean {
    const now = this.clock.now();
    const previous = this.last.get(id);
    if (
      previous &&
      now - previous.at < this.minIntervalMs &&
      haversineKm(previous, position) < this.minMoveKm
    ) {
      return false;
    }
    this.last.set(id, { at: now, lat: position.lat, lng: position.lng });
    return true;
  }
}

/** Allows at most one reroute per tour per window. */
export class RerouteGate {
  private readonly last = new Map<string, number>();

  constructor(
    private readonly clock: Clock,
    private readonly throttleMs: number,
  ) {}

  allow(id: string): boolean {
    const now = this.clock.now();
    const previous = this.last.get(id);
    if (previous !== undefined && now - previous < this.throttleMs) return false;
    this.last.set(id, now);
    return true;
  }
}
