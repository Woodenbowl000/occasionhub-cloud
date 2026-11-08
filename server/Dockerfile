# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# OccasionHub API (application tier): Express + Prisma on Node.js 22
# Multi-stage build: dev dependencies and TypeScript never reach the final image.
# ---------------------------------------------------------------------------

# ---- 1. dependencies (cached until package*.json or the schema change) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall runs `prisma generate` for this platform
RUN npm ci --no-audit --no-fund

# ---- 2. build TypeScript, then drop dev dependencies ----
FROM deps AS build
COPY tsconfig.json tsconfig.seed.json ./
COPY src ./src
RUN npm run build \
 && npx tsc -p tsconfig.seed.json \
 && npm prune --omit=dev --no-audit --no-fund

# ---- 3. runtime: small, non-root ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3002
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/dist-seed ./dist-seed
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node package.json docker-entrypoint.js ./
# Local-disk photo storage (docker compose only; on AWS photos go to S3)
RUN mkdir -p /app/uploads && chown node:node /app/uploads

ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="occasionhub-api" \
      org.opencontainers.image.version="${APP_VERSION}"

USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3002/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# tini forwards SIGTERM so the server can shut down gracefully
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "docker-entrypoint.js"]
