import { nearestVertex, pathLengthKm, haversineKm } from './distance';
import type { LatLng, NavProgress, NavStep } from './types';

/**
 * Which instruction applies now, and how far is left.
 * A step owns the stretch of polyline starting at the vertex nearest its location.
 */
export function navigationProgress(
  position: LatLng,
  steps: NavStep[],
  line: LatLng[],
): NavProgress {
  if (steps.length === 0 || line.length === 0) return { stepIndex: 0, remainingKm: 0 };

  const here = nearestVertex(position, line);
  let stepIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    if (nearestVertex(steps[i].location, line) <= here) stepIndex = i;
  }
  const remainingKm = haversineKm(position, line[here]) + pathLengthKm(line.slice(here));
  return { stepIndex, remainingKm };
}
