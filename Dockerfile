FROM oven/bun:1.2 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

# Build shared package
FROM deps AS build-shared
COPY packages/shared/ packages/shared/
RUN bun run --filter @shared-alarm/shared build 2>/dev/null || true

# Build web app
FROM build-shared AS build-web
COPY apps/web/ apps/web/
RUN bun run --filter @shared-alarm/web build

# Build API
FROM build-shared AS build-api
COPY apps/api/ apps/api/
RUN bun build apps/api/src/index.ts --outdir apps/api/dist --target bun

# Production image
FROM oven/bun:1.2-slim AS production
WORKDIR /app

COPY --from=build-api /app/apps/api/dist/ ./dist/
COPY --from=build-api /app/apps/api/drizzle/ ./drizzle/
COPY --from=build-web /app/apps/web/dist/ ./public/

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=./data/shared-alarm.db

EXPOSE 3000

CMD ["bun", "run", "dist/index.js"]
