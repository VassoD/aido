interface Entry<TValue> {
  value: TValue;
  expiresAt: number;
}

/**
 * Small in-memory TTL cache with LRU eviction. Instances are reused across requests
 * on Fluid Compute, so this cuts repeated calls to rate-limited upstream APIs.
 * It is best-effort: each instance has its own copy.
 */
export class TtlCache<TValue> {
  private readonly entries = new Map<string, Entry<TValue>>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
  ) {}

  get(key: string): TValue | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: TValue): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }

  async getOrLoad(key: string, load: () => Promise<TValue>): Promise<TValue> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await load();
    this.set(key, value);
    return value;
  }
}
