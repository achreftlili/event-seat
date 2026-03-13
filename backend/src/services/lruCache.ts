import { CacheEntry, CacheStats } from '../types';

export class LRUCache<T> {
  private map: Map<string, CacheEntry<T>> = new Map();
  private head: CacheEntry<T> | null = null;
  private tail: CacheEntry<T> | null = null;
  private maxSize: number;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private sweepInterval: ReturnType<typeof setInterval>;

  constructor(maxSize = 1000, ttlSeconds = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlSeconds * 1000;
    this.sweepInterval = setInterval(() => this.sweep(), 30_000);
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiry) {
      this.remove(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    this.moveToHead(entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiry = Date.now() + this.ttlMs;
      this.moveToHead(existing);
      return;
    }

    if (this.map.size >= this.maxSize) {
      this.evictTail();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      expiry: Date.now() + this.ttlMs,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
    if (!this.tail) {
      this.tail = entry;
    }

    this.map.set(key, entry);
  }

  remove(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.detach(entry);
    this.map.delete(key);
    return true;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.map.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0.0%',
      evictions: this.evictions,
      avgResponseTimeMs: 0,
    };
  }

  destroy(): void {
    clearInterval(this.sweepInterval);
    this.clear();
  }

  private moveToHead(entry: CacheEntry<T>): void {
    if (entry === this.head) return;
    this.detach(entry);
    entry.prev = null;
    entry.next = this.head;
    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
    if (!this.tail) {
      this.tail = entry;
    }
  }

  private detach(entry: CacheEntry<T>): void {
    if (entry.prev) {
      entry.prev.next = entry.next;
    } else {
      this.head = entry.next;
    }
    if (entry.next) {
      entry.next.prev = entry.prev;
    } else {
      this.tail = entry.prev;
    }
    entry.prev = null;
    entry.next = null;
  }

  private evictTail(): void {
    if (!this.tail) return;
    const key = this.tail.key;
    this.detach(this.tail);
    this.map.delete(key);
    this.evictions++;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (now > entry.expiry) {
        this.remove(key);
      }
    }
  }
}
