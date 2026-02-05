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

# Production image
FROM oven/bun:1.2-slim AS production
WORKDIR /app

# Copy node_modules (needed for firebase-admin native deps)
COPY --from=deps /app/node_modules/ ./node_modules/

# Copy shared package
COPY --from=build-shared /app/packages/shared/ ./packages/shared/

# Copy API source + drizzle migrations
COPY apps/api/src/ ./apps/api/src/
COPY apps/api/drizzle/ ./apps/api/drizzle/
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.json ./

# Copy built web app as static files into the API working dir
COPY --from=build-web /app/apps/web/dist/ ./apps/api/public/

# Create data directory for SQLite
RUN mkdir -p /app/apps/api/data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=./data/shared-alarm.db

EXPOSE 3001

WORKDIR /app/apps/api
CMD ["bun", "run", "src/index.ts"]
