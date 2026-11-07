interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Small least-recently-used cache with a time to live. */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export interface Sleeper {
  now(): number;
  sleep(ms: number): Promise<void>;
}

/** Spaces calls out so a public geocoder is queried at most once per interval. */
export class MinIntervalLimiter {
  private nextAt = 0;

  constructor(
    private readonly intervalMs: number,
    private readonly clock: Sleeper,
  ) {}

  async wait(): Promise<void> {
    const now = this.clock.now();
    const delay = Math.max(0, this.nextAt - now);
    this.nextAt = Math.max(this.nextAt, now) + this.intervalMs;
    if (delay > 0) await this.clock.sleep(delay);
  }
}
