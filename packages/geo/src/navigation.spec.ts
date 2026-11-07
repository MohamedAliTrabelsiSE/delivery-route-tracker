import { navigationProgress } from './navigation';
import type { NavStep } from './types';

const line = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 0, lng: 2 },
  { lat: 0, lng: 3 },
];

const steps: NavStep[] = [
  { instruction: 'Head east', distanceKm: 2, location: line[0] },
  { instruction: 'Keep going', distanceKm: 1, location: line[2] },
];

describe('navigationProgress', () => {
  it('starts on the first step', () => {
    const progress = navigationProgress({ lat: 0, lng: 0.1 }, steps, line);
    expect(progress.stepIndex).toBe(0);
    expect(progress.remainingKm).toBeGreaterThan(300);
  });

  it('advances once the traveller passes a step', () => {
    expect(navigationProgress({ lat: 0, lng: 2.1 }, steps, line).stepIndex).toBe(1);
  });

  it('returns zeros without steps or a line', () => {
    expect(navigationProgress({ lat: 0, lng: 0 }, [], line)).toEqual({ stepIndex: 0, remainingKm: 0 });
    expect(navigationProgress({ lat: 0, lng: 0 }, steps, [])).toEqual({ stepIndex: 0, remainingKm: 0 });
  });
});
