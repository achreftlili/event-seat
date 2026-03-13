import { Request, Response, NextFunction } from 'express';
import { RateLimitState } from '../types';

const clients: Map<string, RateLimitState> = new Map();

export function resetRateLimiter(): void {
  clients.clear();
}

const GLOBAL_MAX = parseInt(process.env.RATE_LIMIT_MAX || '10', 10);
const GLOBAL_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const BURST_MAX = 5;
const BURST_WINDOW_MS = 10_000;

function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();

  let state = clients.get(ip);

  if (!state) {
    state = {
      tokens: GLOBAL_MAX,
      burstCount: 0,
      lastRefill: now,
      burstWindowStart: now,
    };
    clients.set(ip, state);
  }

  // Refill tokens based on elapsed time (sliding window)
  const elapsed = now - state.lastRefill;
  const refill = (elapsed / GLOBAL_WINDOW_MS) * GLOBAL_MAX;
  state.tokens = Math.min(GLOBAL_MAX, state.tokens + refill);
  state.lastRefill = now;

  // Reset burst window if expired
  if (now - state.burstWindowStart > BURST_WINDOW_MS) {
    state.burstCount = 0;
    state.burstWindowStart = now;
  }

  // Check burst limit
  if (state.burstCount >= BURST_MAX) {
    const retryAfter = Math.ceil((state.burstWindowStart + BURST_WINDOW_MS - now) / 1000);
    res.set({
      'X-RateLimit-Limit': String(GLOBAL_MAX),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil((state.burstWindowStart + BURST_WINDOW_MS) / 1000)),
      'Retry-After': String(retryAfter),
    });
    res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
    return;
  }

  // Check global limit
  if (state.tokens < 1) {
    const retryAfter = Math.ceil(GLOBAL_WINDOW_MS / GLOBAL_MAX / 1000);
    res.set({
      'X-RateLimit-Limit': String(GLOBAL_MAX),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil((now + GLOBAL_WINDOW_MS / GLOBAL_MAX) / 1000)),
      'Retry-After': String(retryAfter),
    });
    res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
    return;
  }

  // Consume token
  state.tokens -= 1;
  state.burstCount += 1;

  res.set({
    'X-RateLimit-Limit': String(GLOBAL_MAX),
    'X-RateLimit-Remaining': String(Math.floor(state.tokens)),
    'X-RateLimit-Reset': String(Math.ceil((now + GLOBAL_WINDOW_MS) / 1000)),
  });

  next();
}
