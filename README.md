# ProductSphere 🛍️

A personal project — a production-grade REST API for querying product data, built with TypeScript, Express, MongoDB, and Redis. Ships with API key authentication, tiered rate limiting, Redis caching, a multi-stage Docker setup, NGINX load balancing, and a CI/CD pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript |
| Framework | Express 5 |
| Database | MongoDB (Atlas) + Mongoose |
| Cache / Rate limit store | Redis 7 |
| Reverse proxy / LB | NGINX 1.27 |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Testing | Jest + Supertest + ts-jest |

---

## Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts       # register, login
│   ├── health.controller.ts     # GET /api/health
│   └── product.controller.ts   # getProducts, getProductByUniqId
├── services/
│   ├── auth.service.ts          # bcrypt hashing, JWT, API key generation
│   └── product.service.ts      # query building, Redis caching
├── middleware/
│   ├── apiKeyAuth.ts            # x-api-key header validation
│   └── rateLimiter.ts           # tier-based daily request limit via Redis
├── models/
│   ├── user.model.ts
│   └── product.model.ts
├── routes/
│   ├── auth.routes.ts
│   ├── product.route.ts
│   ├── health.route.ts
│   └── index.ts
├── config/
│   ├── db.ts                    # Mongoose connect
│   └── redis.ts                 # Redis client
└── server.ts

nginx/
└── nginx.conf                   # load balancer config

tests/
├── unit/
│   └── controllers/             # auth, product, health controller tests
├── setup.ts                     # mongodb-memory-server global setup
└── testApp.ts
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | None | Register and receive an API key |
| `POST` | `/api/auth/login` | None | Login and receive JWT + API key |

**Register / Login body:**
```json
{ "email": "you@example.com", "password": "yourpassword" }
```

**Register response:**
```json
{ "message": "User registered", "apiKey": "abc123..." }
```

**Login response:**
```json
{ "token": "eyJ...", "apiKey": "abc123..." }
```

---

### Products

All product routes require the `x-api-key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/product` | Paginated product list with filters |
| `GET` | `/api/product/:uniqId` | Single product by unique ID |

**Query parameters for `GET /api/product`:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20) |
| `search` | string | Full-text search on title, description, brand |
| `category` | string | Filter by category |
| `brand` | string | Filter by brand |
| `siteName` | string | Filter by source site |
| `minPrice` | number | Minimum price |
| `maxPrice` | number | Maximum price |
| `inStock` | boolean | Filter in-stock only |
| `sortBy` | `price` \| `createdAt` \| `title` | Sort field |
| `order` | `asc` \| `desc` | Sort direction |

---

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | None | Live service health check |

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-28T09:59:48.000Z",
  "services": {
    "database": { "status": "ok" },
    "redis":    { "status": "ok" }
  }
}
```

`status` is `"ok"` when all services are healthy, `"degraded"` when any are not. Always returns HTTP `200`.

---

## Architecture & Optimisations

### 1. Redis Response Caching

Product queries are expensive — they involve dynamic filters, sorting, and pagination across a large dataset. To avoid hammering MongoDB on repeated identical requests, results are cached in Redis.

**`GET /api/product` (paginated list)**
- Cache key encodes every query parameter (`page`, `limit`, `search`, `category`, `brand`, `siteName`, `minPrice`, `maxPrice`, `inStock`, `sortBy`, `order`)
- TTL: **60 seconds** — fresh enough for a public API
- Cache hit skips the MongoDB query entirely

**`GET /api/product/:uniqId` (single product)**
- Cache key: `product:<uniqId>`
- TTL: **5 minutes** — individual products change rarely

**Flow:**
```
Request → Redis? ──hit──→ Return cached JSON
                └─miss──→ MongoDB query → cache result → return
```

---

### 2. Tiered Rate Limiting (Redis)

Every authenticated user has a daily request allowance stored in Redis, scoped to their API key.

| Plan | Daily limit |
|------|------------|
| `free` | 100 requests |
| `basic` | 500 requests |
| `pro` | 1,000 requests |
| `enterprise` | 10,000 requests |

**How it works:**
- Redis key: `rate:<apiKey>`, incremented with `INCR` on every request
- On first request of the day: `EXPIRE` sets a 24-hour TTL
- If count exceeds the plan limit → `429 Rate Limit Exceeded`

Using Redis's atomic `INCR` means this is race-condition safe and works correctly regardless of how many app replicas are running.

---

### 3. NGINX Load Balancer

NGINX sits in front of the Express app, distributing traffic across **3 replicas** (configurable).

**Algorithm: `least_conn`**
Routes each new request to the upstream instance with the fewest active connections — better than round-robin for APIs where some requests (heavy filters, full-text search) take longer than others.

**Upstream keepalive pool (32 connections)**
Persistent TCP connections between NGINX and each app instance — eliminates the overhead of a new TCP handshake on every proxied request.

**Per-route rate limiting at the proxy layer:**

| Route | Rate | Burst |
|-------|------|-------|
| `/api/health` | 30 req/min | 10 |
| `/api/auth/` | 60 req/min | 10 (strict — protects login) |
| `/api/product/` | 60 req/min | 30 |
| `/api/` (catch-all) | 60 req/min | 20 |

**Other NGINX optimisations:**
- Gzip compression (level 5) for JSON responses
- `tcp_nopush` + `sendfile` for efficient data transfer
- `multi_accept on` — workers accept all pending connections at once
- `worker_processes auto` — one worker per CPU core
- Security headers on every response (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `X-Request-ID`)
- Custom JSON error bodies for `429`, `502`, `503`, `504`

---

### 4. Multi-Stage Docker Build

The Dockerfile uses two stages to keep the production image lean.

```dockerfile
Stage 1 — builder  (node:22-alpine)
  npm ci                 # installs ALL dependencies
  tsc                    # compiles TypeScript → dist/

Stage 2 — runner   (node:22-alpine)
  npm ci --omit=dev      # prod dependencies only
  COPY dist/ from builder
  USER node              # non-root for security
  HEALTHCHECK → /api/health
```

**What this achieves:**
- Dev dependencies (TypeScript, ts-jest, types, etc.) are never in the final image
- Source `.ts` files are not in the final image
- Result: a significantly smaller, more secure production image

---

### 5. Database Query Optimisations

- `Promise.all([countDocuments, find])` — count and fetch run in parallel, cutting latency roughly in half vs sequential
- `.lean()` — returns plain JS objects instead of Mongoose documents, faster serialisation and lower memory
- Dynamic filter object — only set fields that were actually passed, minimising the MongoDB query scope

---

## Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Redis URL (`redis://localhost:6379` locally, `redis://redis:6379` in Docker) |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | Server port (default: `3000`) |

---

## Running Locally

```bash
npm install
npm run dev          # ts-node-dev with auto-reload
```

## Running with Docker

```bash
docker compose up --build -d

# Scale app replicas
docker compose up --scale app=5 -d

# Tail logs
docker compose logs -f

# Stop everything
docker compose down
```

Traffic flows: `localhost:80` → NGINX → app replicas → Redis / MongoDB

---

## Tests

```bash
npm test             # run all tests with coverage
```

Tests use `mongodb-memory-server` (no real database needed) and mock Redis, so they run entirely in-memory with no external dependencies.

**Coverage:**
- Auth controller — register success/failure, login success/failure
- Product controller — query parsing, 200/404/error paths
- Health controller — all healthy, DB down, Redis down, both down, timestamp format

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

```
Push to `test` branch
        │
        ▼
  [ Run Tests ]  — npm ci + npm test on Node 22
        │
  pass? │  fail? └──→ pipeline stops, main is untouched
        ▼
  [ Merge → main ]  — no-FF merge, auto-push
```

No external secrets required — uses the built-in `GITHUB_TOKEN`.
