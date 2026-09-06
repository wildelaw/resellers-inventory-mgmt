# ---- Base ----
FROM node:25-alpine AS base
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build without a database (lazy db connection via Proxy pattern)
RUN npm run build

# ---- Migration-only deps ----
# The standalone build bundles drizzle-orm into its server chunks, so it is
# NOT present in the traced node_modules. scripts/migrate-runner.js needs it
# at startup, so install it standalone (pure JS — no native build).
FROM node:25-alpine AS migrate-deps
RUN npm i --prefix /md --no-audit --no-fund drizzle-orm@^0.45.2

# ---- Runtime ----
FROM node:25-alpine AS runner
RUN apk add --no-cache libc6-compat sqlite wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=migrate-deps --chown=nextjs:nodejs /md/node_modules/drizzle-orm ./node_modules/drizzle-orm
RUN chmod +x ./scripts/entrypoint.sh

RUN mkdir -p /data/uploads /data/backups && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/scripts/entrypoint.sh"]