# ---------- Stage 1: Dependencies ----------
FROM node:25-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# ---------- Stage 2: Build ----------
FROM node:25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ---------- Stage 3: Production ----------
FROM node:25-alpine AS runner
WORKDIR /app
RUN apk add --no-cache sqlite openssl wget
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN mkdir -p /data/uploads /data/backups && chown -R 1001:1001 /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/drizzle ./drizzle
COPY --from=builder --chown=1001:1001 /app/scripts ./scripts
COPY --from=builder --chown=1001:1001 /app/src/lib ./src/lib

USER 1001
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["sh", "scripts/entrypoint.sh"]

# ---------- Dev stage (docker-compose.override) ----------
FROM node:25-alpine AS dev
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl sqlite
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
