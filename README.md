# Interactive Event Seating Map & User Data API

A fullstack Dockerized application with an interactive SVG seating map (React/TypeScript) and a User Data API (Express/TypeScript) featuring LRU caching, rate limiting, and queue-based async processing.

## Architecture

| Service  | Technology                        | Port                     |
| -------- | --------------------------------- | ------------------------ |
| Frontend | React 18 + Vite + TS (Nginx prod) | 80 (prod) / 5173 (dev)  |
| Backend  | Express.js + TypeScript           | 3000                     |

Both services run in Docker containers connected via a bridge network. In production the frontend Nginx reverse-proxies `/api/*` requests to the backend container.

## Quick Start

### Prerequisites

- Docker & Docker Compose

### Development Mode (hot-reload)

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health

### Production Mode

```bash
cp .env.example .env
docker compose up --build
```

Access the app at http://localhost (port 80). The API is available at http://localhost/api.

## How to Test

### Step 1 — Start the application

```bash
# Copy environment file
cp .env.example .env

# Production mode (port 80)
docker compose up --build

# OR development mode with hot-reload (port 5173 + 3000)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Step 2 — Run the automated test suites

```bash
# Backend tests (38 tests — LRU cache, job queue, API endpoints)
docker compose -f docker-compose.dev.yml run --rm backend pnpm test

# Frontend tests (39 tests — store, utils, constants)
docker compose -f docker-compose.dev.yml run --rm frontend pnpm test
```

### Step 3 — Test the API manually (cURL)

```bash
# Health check
curl http://localhost/api/health

# Get a user (IDs 1–3 are pre-seeded)
curl http://localhost/api/users/1
# → {"id":1,"name":"John Doe","email":"john@example.com"}

# Get the same user again (observe cache hit)
curl http://localhost/api/users/1
# → {"id":1,"name":"John Doe","email":"john@example.com","cached":true}

# Request a non-existent user
curl http://localhost/api/users/999
# → 404 {"error":"User with ID 999 not found"}

# Create a new user
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob Wilson", "email": "bob@example.com"}'

# View cache statistics (size, hits, misses, hit rate, avg response time)
curl http://localhost/api/cache-status

# Clear the entire cache
curl -X DELETE http://localhost/api/cache
# → 204 No Content
```

### Step 4 — Test rate limiting

```bash
# Send 11 rapid requests to trigger the rate limit (max 10/min)
for i in $(seq 1 11); do
  echo "Request $i: $(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/users/1)"
done
# → Requests 1–10 return 200, request 11 returns 429 Too Many Requests
```

### Step 5 — Test the seating map & real-time WebSocket sessions

1. Open **http://localhost** in your browser
2. Enter an email address (e.g. `user1@test.com`) to log in
3. The seating map loads with 15,000+ seats across 12 sections
4. **Zoom/pan** with mouse wheel and drag to explore sections
5. **Click** an available (green) seat to reserve it — it turns blue
6. **Open a second browser tab** (or incognito window) at http://localhost
7. Log in with a **different email** (e.g. `user2@test.com`)
8. Observe that the seat reserved by user1 shows as **yellow (reserved)** in real-time
9. User2 **cannot** reserve a seat already taken by user1
10. **Sold seats** (red) cannot be reserved by anyone
11. Click "Release all" to release your reservations — all other sessions see the update instantly
12. Close a tab — that user's reservations are automatically released

**What to verify:**
- Seat status changes propagate instantly across all browser tabs/windows
- Maximum 8 seats can be reserved per user
- The online user count in the header updates as users join/leave
- The minimap (top-left) shows your viewport position
- Hovering a seat shows its details in the left panel

## API Endpoints

| Method | Path               | Description                      |
| ------ | ------------------ | -------------------------------- |
| GET    | `/api/health`      | Health check (not rate-limited)  |
| GET    | `/api/users/:id`   | Get user by ID (cache-first)     |
| POST   | `/api/users`       | Create a new user                |
| DELETE | `/api/cache`       | Clear the cache (returns 204)    |
| GET    | `/api/cache-status`| Cache metrics (size, hit rate)   |

All `/api/*` routes (except health) are rate-limited. Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) are included in every response.

## Caching Strategy

The backend uses a **custom LRU (Least Recently Used) cache** built from scratch with a doubly-linked list and a `Map`:

- **O(1) get/set/delete** — the `Map` provides constant-time key lookup; the linked list tracks access order without shifting arrays.
- **Automatic eviction** — when the cache reaches `CACHE_MAX_SIZE` (default 1000), the least recently accessed entry is evicted from the tail of the list.
- **TTL expiration** — every entry carries an expiry timestamp (`CACHE_TTL_SECONDS`, default 60s). Expired entries are lazily pruned on access and proactively swept every 30 seconds.
- **Cache-aside pattern** — on `GET /api/users/:id`, the service checks the cache first. On a miss it fetches from the simulated database (200ms delay), stores the result, and returns it. Subsequent requests for the same ID are served from cache (response includes `"cached": true`).
- **Stats** — `GET /api/cache-status` exposes size, max size, hits, misses, hit rate, eviction count, and average response time (ms) for observability.

## Rate Limiting Implementation

The API uses a **dual-window token bucket** rate limiter applied per client IP:

1. **Global bucket** — each client gets `RATE_LIMIT_MAX` tokens (default 10) that refill continuously over `RATE_LIMIT_WINDOW_MS` (default 60s). This provides a sliding-window effect rather than a hard reset, smoothing out request distribution.
2. **Burst window** — a separate counter allows at most 5 requests within any 10-second window, preventing short bursts from consuming the entire global quota.
3. **Response headers** — every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`. When a limit is hit, the response is `429 Too Many Requests` with a `Retry-After` header.

The health endpoint (`/api/health`) is mounted before the rate limiter so it always responds, which is important for Docker health checks.

## Asynchronous Processing

Database fetches are handled by a **job queue** with request coalescing:

- **Concurrency control** — at most 5 database fetches run in parallel. Additional requests are queued FIFO and processed as slots open.
- **Request deduplication** — if two requests for the same user ID arrive while a fetch is already in flight, the second request receives the same promise instead of triggering a duplicate database call. This prevents thundering-herd scenarios on cache misses.
- **Timeout protection** — each job has a 5-second timeout. If the simulated database takes too long, the job rejects with a `Job timeout` error, which the error handler middleware translates to a `504 Gateway Timeout` response.
- **Error isolation** — a failed job does not affect other jobs in the queue. Each promise resolves or rejects independently.

## Frontend Features

- Email-based session login
- **Real-time multi-user seat reservation via WebSocket** — seat changes propagate instantly to all connected clients
- SVG seating map rendering 15,000+ seats across 12 sections using Material Design seat icons
- Viewport culling — only seats visible in the current viewport are rendered
- Zoom/pan with mouse wheel and drag
- Keyboard navigation (arrow keys, Enter/Space to select)
- Minimap showing the full venue with a viewport indicator
- Hover detail panel showing section, row, seat, tier, and price
- Selection limit of 8 seats per user with toast notifications
- Sold/held seats are enforced server-side and cannot be reserved
- Real-time subtotal calculation in the selection summary
- Online user count displayed in the header
- Auto-release of reservations when a user disconnects
- State persistence via localStorage (Zustand persist middleware)
- WCAG 2.1 AA accessible (aria-labels, grid roles, focus management)

## Environment Variables

| Variable               | Default       | Description                  |
| ---------------------- | ------------- | ---------------------------- |
| `NODE_ENV`             | `development` | Environment mode             |
| `API_PORT`             | `3000`        | Backend port                 |
| `RATE_LIMIT_MAX`       | `10`          | Max requests per window      |
| `RATE_LIMIT_WINDOW_MS` | `60000`       | Rate limit window (ms)       |
| `CACHE_TTL_SECONDS`    | `60`          | Cache entry TTL (seconds)    |
| `CACHE_MAX_SIZE`       | `1000`        | Max cache entries            |

## Useful Commands

| Command                                                                 | Description                    |
| ----------------------------------------------------------------------- | ------------------------------ |
| `docker compose up --build`                                             | Build and start (production)   |
| `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`     | Dev mode with HMR              |
| `docker compose -f docker-compose.dev.yml run --rm backend pnpm test`   | Run backend tests              |
| `docker compose -f docker-compose.dev.yml run --rm frontend pnpm test`  | Run frontend tests             |
| `docker compose down -v`                                                | Stop and remove volumes        |
| `docker compose logs -f backend`                                        | Tail backend logs              |
