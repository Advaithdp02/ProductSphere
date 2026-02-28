# ──────────────────────────────────────────────
# Stage 1: Build
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cache friendly)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ──────────────────────────────────────────────
# Stage 2: Production runner
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

# Security: run as non-root
USER node

WORKDIR /app

# Install only production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
