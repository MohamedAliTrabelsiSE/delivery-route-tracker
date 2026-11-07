import { MinIntervalLimiter, TtlCache } from './cache';

describe('TtlCache', () => {
  let now = 1_000;
  const cache = new TtlCache<string>(2, 500, () => now);

  it('expires entries and evicts the least recently used', () => {
    cache.set('a', 'A');
    cache.set('b', 'B');
    expect(cache.get('a')).toBe('A');
    cache.set('c', 'C');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.size).toBe(2);

    now += 500;
    expect(cache.get('a')).toBeUndefined();
  });

  it('replacing a key does not grow the cache', () => {
    const small = new TtlCache<number>(1, 1000, () => 0);
    small.set('k', 1);
    small.set('k', 2);
    expect(small.size).toBe(1);
    expect(small.get('k')).toBe(2);
  });
});

describe('MinIntervalLimiter', () => {
  it('lets the first call through and delays the next one', async () => {
    let now = 0;
    const sleeps: number[] = [];
    const limiter = new MinIntervalLimiter(1000, {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    });
    await limiter.wait();
    await limiter.wait();
    expect(sleeps).toEqual([1000]);
  });

  it('does not sleep when the interval already elapsed', async () => {
    let now = 0;
    const limiter = new MinIntervalLimiter(1000, { now: () => now, sleep: async () => undefined });
    await limiter.wait();
    now = 5000;
    await expect(limiter.wait()).resolves.toBeUndefined();
  });
});
