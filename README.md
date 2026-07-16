# Resell Inventory Manager

Self-hosted, single-tenant web application for resellers to track inventory purchases, sales, profitability, and mileage.

## Tech Stack

- **Next.js 16** (App Router) + React 19
- **SQLite** via **Drizzle ORM**
- **NextAuth v5** (Credentials, JWT)
- **Tailwind CSS 4**
- **Caddy 2** reverse proxy (TLS + rate limiting)
- **bcrypt**, **Zod**, **PapaParse**

## Quick Start (Development)

```bash
npm install
cp .env.example .env.local
npx drizzle-kit generate
npx tsx src/scripts/seed.ts
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/setup` to create the first admin.

## Production (Docker)

```bash
./scripts/generate-secret.sh   # copy the secret
./scripts/generate-self-signed-cert.sh
# Edit .env.local with AUTH_SECRET, AUTH_URL
docker compose --profile https up -d
curl -k https://localhost/api/health
```

## Documentation

See the `docs/` directory:

- `docs/REQUIREMENTS.md` — feature requirements
- `docs/ARCHITECTURE.md` — system architecture
- `docs/DESIGN.md` — design decisions
- `docs/IMPLEMENTATION.md` — implementation guide
- `docs/API_REFERENCE.md` — complete API reference
- `docs/UI_SPECIFICATION.md` — page-by-page UI spec
- `docs/OPERATIONS.md` — deployment & ops runbook
- `docs/TEST_STRATEGY.md` — testing approach
- `docs/THREAT_MODEL.md` — security threat model
- `docs/BUILD_PROMPT.md` — AI agent build instructions

## Testing

```bash
npm test              # unit + functional + integration
npm run test:e2e      # Playwright (requires dev server)
```
