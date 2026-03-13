export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiry: number;
  prev: CacheEntry<T> | null;
  next: CacheEntry<T> | null;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
  evictions: number;
  avgResponseTimeMs: number;
}

export interface RateLimitState {
  tokens: number;
  burstCount: number;
  lastRefill: number;
  burstWindowStart: number;
}

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Job<T> {
  id: string;
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  status: JobStatus;
}
