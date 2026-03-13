import { LRUCache } from './lruCache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 60);
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('get / set', () => {
    it('returns undefined for missing keys', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('stores and retrieves a value', () => {
      cache.set('a', 'alpha');
      expect(cache.get('a')).toBe('alpha');
    });

    it('overwrites an existing key', () => {
      cache.set('a', 'v1');
      cache.set('a', 'v2');
      expect(cache.get('a')).toBe('v2');
      expect(cache.getStats().size).toBe(1);
    });
  });

  describe('eviction', () => {
    it('evicts the least recently used entry when capacity is exceeded', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      // cache is full (3). Adding 'd' should evict 'a' (LRU)
      cache.set('d', '4');
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('d')).toBe('4');
    });

    it('promotes accessed entries so they are not evicted', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      // Access 'a' to promote it
      cache.get('a');
      // 'b' is now LRU
      cache.set('d', '4');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe('1');
    });

    it('tracks eviction count in stats', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4');
      cache.set('e', '5');
      expect(cache.getStats().evictions).toBe(2);
    });
  });

  describe('TTL expiration', () => {
    it('returns undefined for expired entries', async () => {
      const shortCache = new LRUCache<string>(10, 1); // 1 second TTL
      shortCache.set('a', 'value');
      // Entry should be available immediately
      expect(shortCache.get('a')).toBe('value');
      // Wait for TTL to expire
      await new Promise((r) => setTimeout(r, 1100));
      expect(shortCache.get('a')).toBeUndefined();
      shortCache.destroy();
    }, 10000);
  });

  describe('remove', () => {
    it('removes an existing key', () => {
      cache.set('a', '1');
      expect(cache.remove('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
    });

    it('returns false for a non-existent key', () => {
      expect(cache.remove('nope')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.clear();
      expect(cache.getStats().size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('tracks hits and misses', () => {
      cache.set('a', '1');
      cache.get('a'); // hit
      cache.get('b'); // miss
      cache.get('a'); // hit
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe('66.7%');
    });

    it('returns 0.0% hit rate when empty', () => {
      expect(cache.getStats().hitRate).toBe('0.0%');
    });

    it('reports correct size and maxSize', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
    });
  });

  describe('linked list integrity', () => {
    it('handles single-entry cache correctly', () => {
      const tiny = new LRUCache<string>(1, 60);
      tiny.set('a', '1');
      tiny.set('b', '2'); // evicts 'a'
      expect(tiny.get('a')).toBeUndefined();
      expect(tiny.get('b')).toBe('2');
      tiny.destroy();
    });

    it('handles repeated set-remove cycles', () => {
      for (let i = 0; i < 20; i++) {
        cache.set(`k${i}`, `v${i}`);
        if (i > 0) cache.remove(`k${i - 1}`);
      }
      expect(cache.getStats().size).toBeLessThanOrEqual(3);
    });
  });
});
