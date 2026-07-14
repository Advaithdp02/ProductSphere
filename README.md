# ProductSphere

A production-grade REST API for querying product data, built with TypeScript, Express, MongoDB, and Redis. Ships with API key authentication, tiered rate limiting, Redis caching, a multi-stage Docker setup, NGINX load balancing, and a CI/CD pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 + TypeScript |
| Framework | Express 5 |
| Database | MongoDB (Atlas) + Mongoose |
| Cache / Rate limit store | Redis 7 |
| Validation | Zod |
| Reverse proxy / LB | NGINX 1.27 |
| Containerisation | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Testing | Jest + Supertest + ts-jest |
| Linting | ESLint (with TypeScript plugin) |

---

## Project Structure

```
src/
├── controllers/
│   ├── auth.controller.ts       # register, login
│   ├── health.controller.ts     # GET /api/health
│   └── product.controller.ts    # getProducts, getProductByUniqId
├── services/
│   ├── auth.service.ts          # bcrypt hashing, API key generation
│   └── product.service.ts       # query building, Redis caching
├── middleware/
│   ├── apiKeyAuth.ts            # x-api-key header validation + Redis-cached lookups
│   ├── authRateLimiter.ts       # 10 attempts/15min per IP (Redis)
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
├── utils/
│   └── escapeRegex.ts           # NoSQL injection prevention
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
| `POST` | `/api/auth/login` | None | Login and receive an API key |

**Register / Login body:**
```json
{ "email": "you@example.com", "password": "yourpassword" }
```

Email is validated (must be a valid format). Password must be at least 8 characters.

**Register response:**
```json
{ "message": "User registered", "apiKey": "abc123..." }
```

**Login response:**
```json
{ "apiKey": "abc123..." }
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
| `search` | string | Full-text search on title, description, brand (uses MongoDB `$text` index) |
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

**Response (healthy):**
```json
{
  "status": "ok",
  "timestamp": "2026-07-14T09:59:48.000Z",
  "services": {
    "database": { "status": "ok" },
    "redis":    { "status": "ok" }
  }
}
```

Returns HTTP `200` when all services are healthy. Returns HTTP `503` when any service is degraded.

---

## Security Features

- **API key authentication** — every request (except auth and health) requires the `x-api-key` header. Keys are stored in MongoDB and cached in Redis (60s TTL) to avoid a DB lookup on every request.
- **Auth rate limiting** — 10 login/register attempts per 15 minutes per IP, stored in Redis. Prevents brute-force attacks.
- **Tiered rate limiting** — per-user daily request limits based on plan tier, stored in Redis with atomic `INCR` (race-condition safe across replicas).
- **Input validation** — all request bodies and query parameters validated with Zod schemas before reaching controllers.
- **NoSQL injection prevention** — `escapeRegex` utility strips special regex characters from any user input used in `$regex` queries.
- **CORS restriction** — only origins listed in the `ALLOWED_ORIGINS` environment variable are permitted.
- **Body size limit** — request bodies capped at 16kb.
- **Password hashing** — bcrypt with salt rounds.
- **Morgan logging** — `combined` format in production, `dev` locally.
- **Security headers** — NGINX adds `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `X-Request-ID` to every response.

---

## Architecture & Optimisations

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT REQUEST                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NGINX (Load Balancer)                                                      │
│  • Rate limiting (per-route)                                                │
│  • Gzip compression                                                         │
│  • Security headers                                                         │
│  • least_conn → selects app instance                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  App #1      │ │  App #2      │ │  App #3      │
            │  (Express)   │ │  (Express)   │ │  (Express)   │
            └──────────────┘ └──────────────┘ └──────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  MIDDLEWARE PIPELINE                                                        │
│  ┌─────────────┐   ┌─────────────────┐   ┌──────────────────┐              │
│  │ CORS        │──▶│ Body Parser     │──▶│ Morgan Logger    │              │
│  │ (origins)   │   │ (16kb limit)    │   │ (combined/dev)   │              │
│  └─────────────┘   └─────────────────┘   └──────────────────┘              │
│                                      │                                      │
│                    ┌─────────────────┴─────────────────┐                    │
│                    ▼                                   ▼                    │
│            ┌──────────────┐                   ┌──────────────┐              │
│            │ /api/auth/*  │                   │ /api/product │              │
│            └──────────────┘                   └──────────────┘              │
│                    │                                   │                    │
│                    ▼                                   ▼                    │
│  ┌─────────────────────────────┐     ┌──────────────────────────────┐      │
│  │ Auth Rate Limiter (Redis)   │     │ API Key Auth                 │      │
│  │ 10 attempts/15min per IP    │     │ ┌──────────────────────────┐ │      │
│  └─────────────────────────────┘     │ │ Redis Cache (60s TTL)    │ │      │
│                    │                 │ │ Hit → skip DB            │ │      │
│                    ▼                 │ │ Miss → MongoDB query     │ │      │
│  ┌─────────────────────────────┐     │ └──────────────────────────┘ │      │
│  │ Input Validation (Zod)      │     └──────────────────────────────┘      │
│  │ Email format, password min  │                    │                       │
│  └─────────────────────────────┘                    ▼                       │
│                    │                 ┌──────────────────────────────┐       │
│                    ▼                 │ Tiered Rate Limiter (Redis)  │       │
│  ┌─────────────────────────────┐     │ free:100 / basic:500 /      │       │
│  │ Controllers                 │     │ pro:1000 / enterprise:10000  │       │
│  │ • Auth: register, login     │     └──────────────────────────────┘       │
│  │ • Product: list, get        │                    │                       │
│  │ • Health: status            │                    ▼                       │
│  └─────────────────────────────┘     ┌──────────────────────────────┐       │
│                    │                 │ Controllers                  │       │
│                    ▼                 │ • Zod validation             │       │
│  ┌─────────────────────────────┐     │ • Query building             │       │
│  │ Services                    │     │ • Response formatting        │       │
│  │ • Business logic            │     └──────────────────────────────┘       │
│  │ • Redis caching             │                    │                       │
│  │ • Query optimization        │                    ▼                       │
│  └─────────────────────────────┘     ┌──────────────────────────────┐       │
│                    │                 │ Services                     │       │
│                    ▼                 │ • Business logic             │       │
│  ┌─────────────────────────────┐     │ • Redis caching (60s/5min)   │       │
│  │ Models (Mongoose)           │     │ • Query optimization         │       │
│  │ • User: email, password,    │     └──────────────────────────────┘       │
│  │   apiKey, plan              │                    │                       │
│  │ • Product: 30+ fields       │                    ▼                       │
│  │   with text + filter indexes│     ┌──────────────────────────────┐       │
│  └─────────────────────────────┘     │ Models (Mongoose)            │       │
│                    │                 │ • User schema                 │       │
│                    ▼                 │ • Product schema              │       │
│  ┌─────────────────────────────┐     │   (text + filter indexes)    │       │
│  │ MongoDB                     │     └──────────────────────────────┘       │
│  │ • Products collection       │                    │                       │
│  │ • Users collection          │                    ▼                       │
│  └─────────────────────────────┘     ┌──────────────────────────────┐       │
│                                      │ MongoDB                      │       │
│                                      │ • Users collection           │       │
│                                      │ • Products collection        │       │
│                                      └──────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  REDIS (Shared across all replicas)                                         │
│  • API key → user cache (60s TTL)                                           │
│  • Product list cache (MD5 hash key, 60s TTL)                               │
│  • Single product cache (300s TTL)                                          │
│  • Rate limit counters (24h TTL)                                            │
│  • Auth attempt counters (15min TTL)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Redis Response Caching

Product queries are expensive — they involve dynamic filters, sorting, and pagination across a large dataset. To avoid hammering MongoDB on repeated identical requests, results are cached in Redis.

**`GET /api/product` (paginated list)**
- Cache key: MD5 hash of all query parameters (`page`, `limit`, `search`, `category`, `brand`, `siteName`, `minPrice`, `maxPrice`, `inStock`, `sortBy`, `order`) — prevents key collisions
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

Every authenticated user has a daily request allowance stored in Redis, scoped to their API key. Using Redis means the counters are shared across all app replicas — a user can't bypass limits by hitting different instances.

| Plan | Daily limit |
|------|------------|
| `free` | 100 requests |
| `basic` | 500 requests |
| `pro` | 1,000 requests |
| `enterprise` | 10,000 requests |

**Auth rate limiting** is separate and runs in parallel — 10 attempts per 15 minutes per IP on `/api/auth/*` endpoints, also stored in Redis.

**How it works:**
- Redis key: `rate:<apiKey>`, incremented with `INCR` on every request
- On first request of the day: `EXPIRE` sets a 24-hour TTL
- If count exceeds the plan limit → `429 Rate Limit Exceeded`

---

### 3. Input Validation (Zod)

All request inputs are validated with Zod schemas before reaching controllers. This catches malformed data early and returns structured error responses instead of undefined behavior.

- **Register** — email format validation, password minimum 8 characters
- **Login** — email required, password required
- **Product queries** — type checking on all query parameters (numbers, booleans, enums)

---

### 4. NGINX Load Balancer

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
- Custom JSON error bodies for `429`, `502`, `503`, `504`

---

### 5. Multi-Stage Docker Build

The Dockerfile uses two stages to keep the production image lean.

```
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
- Dev dependencies (TypeScript, ts-jest, types, ESLint) are never in the final image
- Source `.ts` files are not in the final image
- Result: a significantly smaller, more secure production image

---

### 6. Database Query Optimisations

- **Parallel count + find** — `Promise.all([countDocuments, find])` runs count and fetch in parallel, cutting latency roughly in half vs sequential
- **`.lean()`** — returns plain JS objects instead of Mongoose documents, faster serialisation and lower memory
- **Dynamic filter object** — only set fields that were actually passed, minimising the MongoDB query scope
- **MongoDB text index** — full-text search on `title`, `description`, `brand` fields via `$text` index
- **Filter indexes** — compound index on `category` + `brand`, individual indexes on `price` and `siteName`

---

## Environment Variables

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB Atlas connection string | Yes |
| `REDIS_URL` | Redis URL (`redis://localhost:6379` locally, `redis://redis:6379` in Docker) | Yes |
| `REDIS_PASSWORD` | Redis password (used in Docker Compose) | Docker only |
| `ALLOWED_ORIGINS` | Comma-separated list of permitted CORS origins | Yes |
| `PORT` | Server port (default: `3000`) | No |
| `NODE_ENV` | `production` or `development` (affects logging format) | No |

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

**30 tests** across three controllers:

- **Auth controller** — register success/failure, login success/failure, email validation, password validation
- **Product controller** — query parsing, 200/404/error paths, pagination, filters
- **Health controller** — all healthy, DB down, Redis down, both down, timestamp format

**Coverage thresholds:** 60% statements / 70% branches / 70% functions / 70% lines

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

```
Push to `test` branch
        │
        ▼
  [ Lint ]          — eslint + type-check
        │
        ▼
  [ Run Tests ]     — npm test on Node 22 (30 tests, coverage thresholds enforced)
        │
  pass? │  fail? └──→ pipeline stops, main is untouched
        ▼
  [ Merge → main ]  — no-FF merge, auto-push
```

No external secrets required — uses the built-in `GITHUB_TOKEN`.
