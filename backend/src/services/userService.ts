import { User } from '../types';
import { LRUCache } from './lruCache';
import { JobQueue } from './jobQueue';
import { mockUsers, getNextId } from '../data/mockUsers';

const DB_DELAY_MS = 200;

const cacheMaxSize = parseInt(process.env.CACHE_MAX_SIZE || '1000', 10);
const cacheTtl = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);

export const userCache = new LRUCache<User>(cacheMaxSize, cacheTtl);
const jobQueue = new JobQueue<User | null>(5, 5000);

let totalResponseTimeMs = 0;
let requestCount = 0;

async function simulateDbFetch(id: number): Promise<User | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = mockUsers.find((u) => u.id === id) || null;
      resolve(user);
    }, DB_DELAY_MS);
  });
}

export async function getUserById(id: number): Promise<User | null> {
  const start = Date.now();
  const cacheKey = `user:${id}`;

  const cached = userCache.get(cacheKey);
  if (cached) {
    totalResponseTimeMs += Date.now() - start;
    requestCount++;
    return { ...cached, ...({ cached: true } as Record<string, boolean>) };
  }

  const user = await jobQueue.enqueue(cacheKey, () => simulateDbFetch(id));

  if (user) {
    userCache.set(cacheKey, user);
  }

  totalResponseTimeMs += Date.now() - start;
  requestCount++;
  return user;
}

export function createUser(name: string, email: string): User {
  const user: User = { id: getNextId(), name, email };
  mockUsers.push(user);
  userCache.set(`user:${user.id}`, user);
  return user;
}

export function clearCache(): void {
  userCache.clear();
  totalResponseTimeMs = 0;
  requestCount = 0;
}

export function getCacheStats() {
  return {
    ...userCache.getStats(),
    avgResponseTimeMs: requestCount > 0 ? Math.round(totalResponseTimeMs / requestCount) : 0,
  };
}
