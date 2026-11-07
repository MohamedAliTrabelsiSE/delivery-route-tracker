export const CLOCK = Symbol('CLOCK');

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export function fixedClock(startMs: number): Clock & { set(ms: number): void } {
  let current = startMs;
  return {
    now: () => current,
    set: (ms: number) => {
      current = ms;
    },
  };
}
