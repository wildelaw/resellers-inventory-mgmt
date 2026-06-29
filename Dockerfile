# syntax=docker/dockerfile:1.7

# ---- Dependencies ----
FROM node:25-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ \
 && npm install -g corepack
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Builder ----
FROM node:25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ---- Runtime ----
FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Migration runner + entrypoint
COPY scripts/migrate.js ./scripts/migrate.js
COPY scripts/migrate-runner.js ./scripts/migrate-runner.js
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
COPY drizzle ./drizzle

RUN mkdir -p /data/uploads /data/backups \
 && chown -R 1001:1001 /app /data /tmp \
 && chmod +x ./scripts/entrypoint.sh

USER nextjs
EXPOSE 3000
CMD ["./scripts/entrypoint.sh"]