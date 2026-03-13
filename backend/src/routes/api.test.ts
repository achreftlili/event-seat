import request from 'supertest';
import app from '../index';
import { clearCache, userCache } from '../services/userService';
import { resetRateLimiter } from '../middleware/rateLimiter';

beforeEach(() => {
  clearCache();
  resetRateLimiter();
});

afterAll(() => {
  userCache.destroy();
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('GET /api/users/:id', () => {
  it('returns a user by ID', async () => {
    const res = await request(app).get('/api/users/1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  it('returns cached:true on second fetch', async () => {
    await request(app).get('/api/users/2');
    const res = await request(app).get('/api/users/2');
    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
  });

  it('returns 404 for non-existent user', async () => {
    const res = await request(app).get('/api/users/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('999');
  });

  it('returns 400 for invalid ID', async () => {
    const res = await request(app).get('/api/users/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid user ID');
  });

  it('returns 400 for negative ID', async () => {
    const res = await request(app).get('/api/users/-1');
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero ID', async () => {
    const res = await request(app).get('/api/users/0');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/users', () => {
  it('creates a new user with valid data', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Test User');
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email is required');
  });

  it('returns 400 when name is empty string', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: '   ', email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is empty string', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Valid', email: '  ' });
    expect(res.status).toBe(400);
  });

  it('trims whitespace from name and email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: '  Trimmed  ', email: '  trim@test.com  ' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Trimmed');
    expect(res.body.email).toBe('trim@test.com');
  });
});

describe('DELETE /api/cache', () => {
  it('clears the cache and returns 204', async () => {
    await request(app).get('/api/users/1');
    resetRateLimiter(); // reset after warming cache
    const res = await request(app).delete('/api/cache');
    expect(res.status).toBe(204);
  });
});

describe('GET /api/cache-status', () => {
  it('returns cache statistics', async () => {
    const res = await request(app).get('/api/cache-status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('size');
    expect(res.body).toHaveProperty('maxSize');
    expect(res.body).toHaveProperty('hits');
    expect(res.body).toHaveProperty('misses');
    expect(res.body).toHaveProperty('hitRate');
    expect(res.body).toHaveProperty('evictions');
    expect(res.body).toHaveProperty('avgResponseTimeMs');
  });
});

describe('GET /api/cache/status', () => {
  it('also returns cache statistics via the router mount', async () => {
    const res = await request(app).get('/api/cache/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('size');
  });
});
