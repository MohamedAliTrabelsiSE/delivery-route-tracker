import { haversineKm } from './distance';
import type { LatLng } from './types';

/**
 * Orders stops to shorten the drive. The first point stays put (it is the depot or the
 * driver's current position). Nearest-neighbour builds a tour, then 2-opt uncrosses it.
 * The result is never longer than the input order.
 */
export function optimizeOrder(points: LatLng[]): number[] {
  const count = points.length;
  if (count <= 2) return points.map((_, index) => index);

  const nearest = nearestNeighbour(points);
  const improved = twoOpt(points, nearest);
  return tourLength(points, improved) <= tourLength(points, identity(count))
    ? improved
    : identity(count);
}

function nearestNeighbour(points: LatLng[]): number[] {
  const used = new Set<number>([0]);
  const order = [0];
  while (order.length < points.length) {
    const last = points[order[order.length - 1]];
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 1; index < points.length; index++) {
      if (used.has(index)) continue;
      const distance = haversineKm(last, points[index]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }
    used.add(best);
    order.push(best);
  }
  return order;
}

function twoOpt(points: LatLng[], start: number[]): number[] {
  const order = [...start];
  let improved = true;
  let passes = 0;
  while (improved && passes < 100) {
    improved = false;
    passes += 1;
    for (let i = 1; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const candidate = swap(order, i, k);
        if (tourLength(points, candidate) + 1e-9 < tourLength(points, order)) {
          order.splice(0, order.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return order;
}

function swap(order: number[], from: number, to: number): number[] {
  const next = [...order];
  let left = from;
  let right = to;
  while (left < right) {
    const tmp = next[left];
    next[left] = next[right];
    next[right] = tmp;
    left += 1;
    right -= 1;
  }
  return next;
}

function tourLength(points: LatLng[], order: number[]): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += haversineKm(points[order[i - 1]], points[order[i]]);
  return total;
}

function identity(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

export function tourDistanceKm(points: LatLng[], order: number[]): number {
  return tourLength(points, order);
}
