# Resell Inventory Manager — Architecture Specification

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified architecture specification for the Resell Inventory Manager application.

---

## 1. System Overview

Resell Inventory Manager is a **monolithic full-stack web application** built on Next.js 16 (App Router) with server-side rendering, a SQLite database, and a Caddy reverse proxy for HTTPS termination and rate limiting. It is a self-hosted, single-tenant system deployed via Docker Compose.

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet / LAN                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (443/8443)
                ┌──────▼──────┐
                │    Caddy     │  TLS termination, security headers,
                │  (container) │  rate limiting, HTTP reverse proxy
                └──────┬──────┘
                       │ HTTP (internal Docker network)
                ┌──────▼──────┐
                │  Next.js App │  Server Components, API Routes
                │  (container) │  Auth, Origin/Referer CSRF check
                └──────┬──────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
     ┌─────▼─────┐ ┌──▼───┐ ┌───▼────┐
     │  SQLite   │ │ Photos│ │ Backups│
     │ /data/    │ │ /data/│ │ /data/ │
     │ sqlite.db │ │uploads│ │backups │
     └───────────┘ └──────┘ └────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Runtime | Node.js | 25 Alpine (Docker) |
| Framework | Next.js | 16.x with App Router, Server Components |
| UI Library | React | 19.x |
| Language | TypeScript | Strict mode |
| Database | SQLite | Via better-sqlite3 |
| ORM | Drizzle ORM | 0.45.x with drizzle-kit migrations |
| Auth | NextAuth v5 | Beta 30, Credentials provider, JWT strategy |
| Validation | Zod | 4.x |
| CSS | Tailwind CSS | 4.x |
| Password Hashing | bcrypt | Cost factor 10 |
| CSV Parsing | PapaParse | 5.x |
| Containerization | Docker | Multi-stage build, Alpine-based |
| Reverse Proxy | Caddy | 2 Alpine, TLS termination + rate limiting |
| Testing | Vitest | Unit + functional + integration |
| E2E Testing | Playwright | Browser automation |

---

## 3. Project Structure

```
resell-inv-mgmt/
├── drizzle/                    # Database migration SQL files
│   └── meta/                    # Migration snapshots & journal
├── certs/                       # TLS certificates (gitignored)
├── data/                        # Runtime data (gitignored)
│   ├── sqlite.db
│   ├── uploads/
│   └── backups/
├── scripts/
│   ├── entrypoint.sh            # Container startup (migrate + serve)
│   ├── backup.sh                # Cron backup script
│   ├── migrate-runner.js        # Migration runner for entrypoint
│   ├── migrate.js               # Migration runner module
│   └── generate-secret.sh       # AUTH_SECRET generator
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API route handlers
│   │   │   ├── auth/[...nextauth]/   # NextAuth handlers
│   │   │   ├── admin/           # Admin-only endpoints
│   │   │   │   ├── backup/      # GET - export backup
│   │   │   │   ├── restore/     # POST - restore backup
│   │   │   │   ├── setup-unlock/     # POST - re-open setup
│   │   │   │   ├── settings/         # GET/PUT admin settings
│   │   │   │   └── users/            # GET/POST user CRUD
│   │   │   │       └── [id]/         # Single user operations
│   │   │   │           └── reset-password/
│   │   │   ├── health/          # GET - health check
│   │   │   ├── import/          # POST - CSV import
│   │   │   ├── inventory/       # GET/POST - item CRUD
│   │   │   │   ├── [id]/        # GET/PUT/DELETE single item
│   │   │   │   │   └── photo/   # POST/DELETE photo upload
│   │   │   │   └── bulk/        # PATCH/DELETE bulk operations
│   │   │   ├── mileage/         # GET/POST mileage entries
│   │   │   │   ├── [id]/        # GET/PUT/DELETE single entry
│   │   │   │   ├── export/      # GET CSV export
│   │   │   │   └── reports/     # GET mileage reports
│   │   │   ├── photos/[itemId]/[filename]/  # GET authenticated photo
│   │   │   ├── profile/         # GET/PUT user profile
│   │   │   ├── reports/         # GET dashboard report data
│   │   │   ├── sales/           # GET/POST/PATCH sales
│   │   │   │   └── [id]/        # GET/PUT/DELETE single sale
│   │   │   ├── setup/           # GET/POST/PUT setup flow
│   │   │   └── settings/        # GET/PUT app settings
│   │   ├── admin/               # Admin UI pages
│   │   │   ├── settings/        # Admin settings page
│   │   │   └── users/           # User management page
│   │   ├── imports/             # CSV import UI page
│   │   ├── inventory/           # Inventory UI pages
│   │   │   ├── [id]/            # Item detail
│   │   │   │   └── edit/        # Item edit
│   │   │   └── new/            # New item form
│   │   ├── login/              # Login page
│   │   ├── mileage/            # Mileage UI pages
│   │   │   ├── [id]/edit/      # Edit entry
│   │   │   └── new/            # New entry
│   │   ├── profile/            # User profile page
│   │   ├── reports/            # Reports dashboard page
│   │   ├── sales/              # Sales UI pages
│   │   │   ├── [id]/           # Sale detail
│   │   │   └── new/            # New sale form
│   │   ├── setup/              # Initial setup page
│   │   ├── globals.css          # Tailwind base styles
│   │   ├── layout.tsx           # Root layout (SessionProvider)
│   │   ├── page.tsx             # Home/dashboard page (Server Component)
│   │   └── favicon.ico
│   ├── components/              # Shared React components
│   │   ├── ConfirmModal.tsx     # Confirmation dialog
│   │   ├── RefundEntryModal.tsx # Refund form modal
│   │   ├── SaleFormFields.tsx   # Reusable sale form fields
│   │   ├── SalesEntryModal.tsx # Sale creation/edit modal
│   │   ├── UserModals.tsx       # Admin user management modals
│   │   └── header.tsx          # Navigation header
│   ├── hooks/                   # Custom React hooks
│   │   └── useSaleForm.ts      # Sale form state + tax calculation
│   ├── lib/                     # Core business logic modules
│   │   ├── auth.ts             # NextAuth configuration (Credentials, JWT, callbacks)
│   │   ├── auth-utils.ts       # Server-side auth helpers (requireAuth, requireAdmin)
│   │   ├── api-errors.ts       # ApiError class, handleApiError utility
│   │   ├── api-utils.ts        # Route wrapper (withAuth), pagination, sorting, LIKE escaping
│   │   ├── backup.ts           # Backup validation schemas, restore logic
│   │   ├── config.ts           # Centralized config (paths, auth settings)
│   │   ├── constants.ts        # Item statuses, role labels, transitions
│   │   ├── csv-parser.ts       # PapaParse wrapper, column mapping, fuzzy matching
│   │   ├── csv.ts              # CSV export utility (salesToCsv, downloadCsv)
│   │   ├── db.ts               # Lazy SQLite connection via Proxy pattern
│   │   ├── db-init.ts          # Setup status detection (needsSetup)
│   │   ├── financial.ts        # calculateProfit, calculateNetRevenue, calculateSalesTaxFromPrice
│   │   ├── migrate.ts          # In-app migration runner (checksums, idempotent)
│   │   ├── schema.ts           # Drizzle schema (all tables, relations, types)
│   │   ├── session-provider.tsx # NextAuth SessionProvider wrapper
│   │   ├── utils.ts            # Formatting (currency, dates), getPhotoUrl
│   │   └── validations.ts      # Zod schemas for all inputs
│   └── scripts/
│       ├── seed.ts             # Create admin user
│       └── seed-settings.ts    # Seed default settings
├── tests/
│   ├── unit/                   # Pure logic unit tests
│   ├── functional/             # Real DB operation tests
│   ├── integration/            # API route integration tests
│   ├── e2e/                    # Playwright browser tests
│   ├── setup/                  # Test DB setup, env setup
│   ├── helpers/                # Test request helpers
│   └── mocks/                  # Session mocking
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Production deployment
├── docker-compose.override.yml # Dev overrides
├── Caddyfile                   # Caddy reverse proxy config (TLS + rate limiting)
├── next.config.ts              # Next.js config + security headers
├── drizzle.config.ts           # Drizzle kit config
├── vitest.config.ts            # Test runner config
├── playwright.config.ts        # E2E test config
└── package.json                # Dependencies and scripts
```

---

## 4. Database Schema

### 4.1 Entity-Relationship Diagram

```
users (1) ────────< items (N)
users (1) ────────< sales (N)
users (1) ────────< mileage (N)
items (1) ────────< sales (N)      [sales.itemId nullable]
items (1) ────────< photos (N)
```

### 4.2 Table Definitions

#### `users`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| role | TEXT | NOT NULL, DEFAULT 'user', CHECK IN ('admin','user') |
| can_view_all | INTEGER | NOT NULL, DEFAULT 0 (boolean) |
| is_active | INTEGER | NOT NULL, DEFAULT 1 (boolean) |
| password_changed_at | INTEGER | NOT NULL, DEFAULT 0 (timestamp) |
| created_at | INTEGER | NOT NULL (timestamp) |
| updated_at | INTEGER | NOT NULL (timestamp) |
| created_by | INTEGER | FK → users.id |
| last_login | INTEGER | (timestamp, nullable) |

**Indexes:** `email_idx`, `role_idx`, `is_active_idx`

> **Simplified from v1:** Removed `power_user` role (replaced by `can_view_all` boolean). Removed `failed_login_attempts` and `locked_until` (account lockout removed — rate limiting handled by Caddy). Added `password_changed_at` for session invalidation.

#### `items`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | NOT NULL, max 200 |
| description | TEXT | nullable, max 2000 |
| purchase_date | INTEGER | NOT NULL (timestamp) |
| purchase_price | REAL | NOT NULL |
| purchase_location | TEXT | nullable |
| category | TEXT | nullable |
| status | TEXT | NOT NULL, DEFAULT 'available', enum |
| notes | TEXT | nullable |
| removal_date | INTEGER | nullable (timestamp) |
| metadata | TEXT | nullable (JSON) |
| owner_id | INTEGER | NOT NULL, FK → users.id |
| created_at | INTEGER | NOT NULL (timestamp) |
| updated_at | INTEGER | NOT NULL (timestamp) |

**Status enum:** `available`, `listed`, `sold`, `returned`, `donated`, `discarded`  
**Indexes:** `status_idx`, `owner_id_idx`, `category_idx`, `purchase_date_idx`, `owner_status_idx`

#### `sales`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT |
| item_id | INTEGER | nullable, FK → items.id |
| sold_date | INTEGER | NOT NULL (timestamp) |
| sold_price | REAL | NOT NULL |
| shipping_cost | REAL | nullable |
| shipping_collected | REAL | DEFAULT 0 |
| platform | TEXT | NOT NULL, enum |
| sales_tax | REAL | nullable |
| platform_fees | REAL | DEFAULT 0 |
| refund_amount | REAL | DEFAULT 0 |
| refund_reason | TEXT | nullable |
| refund_type | TEXT | DEFAULT 'none', enum |
| sold_by | INTEGER | NOT NULL, FK → users.id |
| created_at | INTEGER | NOT NULL (timestamp) |

**Platform enum:** `local`, `facebook`, `instagram`, `ebay`, `poshmark`, `mercari`, `consignment`, `other`  
**Refund type enum:** `none`, `refund_no_return`, `refund_with_return`  
**Indexes:** `sold_date_idx`, `item_id_idx`, `platform_idx`, `sold_by_idx`, `sold_by_date_idx`

#### `photos`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT |
| item_id | INTEGER | NOT NULL, FK → items.id ON DELETE CASCADE |
| filename | TEXT | NOT NULL |
| path | TEXT | NOT NULL |
| is_primary | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | INTEGER | NOT NULL (timestamp) |

**Index:** `photo_item_id_idx`

#### `mileage`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT |
| date | INTEGER | NOT NULL (timestamp) |
| miles | REAL | NOT NULL |
| from_location | TEXT | nullable |
| to_location | TEXT | nullable |
| address | TEXT | nullable |
| vehicle | TEXT | nullable |
| purpose | TEXT | nullable |
| owner_id | INTEGER | NOT NULL, FK → users.id |
| created_at | INTEGER | NOT NULL (timestamp) |
| updated_at | INTEGER | NOT NULL (timestamp) |

**Indexes:** `mileage_date_idx`, `mileage_owner_idx`

#### `app_config`
| Column | Type | Constraints |
|--------|------|------------|
| id | INTEGER | PK, AUTOINCREMENT, DEFAULT 1 |
| company_name | TEXT | DEFAULT 'Resale Manager' |
| company_tagline | TEXT | DEFAULT '' |
| sales_tax_rate | REAL | DEFAULT 0.0825 |
| setup_complete | INTEGER | NOT NULL, DEFAULT 0 (boolean) |
| updated_at | INTEGER | NOT NULL (timestamp) |

> **Simplified from v1:** Replaces the key-value `settings` table with a single-row typed table. `setup_complete` is now a proper boolean column instead of a setting key. Only one row ever exists.

> **Removed tables from v1:** `sessions` (not used with JWT), `accounts` (reserved for OAuth, unused), `verification_tokens` (unused), `revoked_tokens` (replaced by `password_changed_at` on users).

---

## 5. API Architecture

### 5.1 Request Flow

```
Client Request
    │
    ▼
┌──────────────────┐
│  Next.js Router   │  middleware.ts: Setup check → redirect to /setup if needed
│  (App Router)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  API Route Handler│
│  (route.ts)       │
└──────┬───────────┘
       │
       ├─► validateOriginOrReferer(req)  ← CSRF: Origin/Referer check (POST/PUT/DELETE/PATCH)
       │
       ├─► auth()                        ← NextAuth session check
       │
       ├─► checkPasswordChanged(session) ← Session invalidation via passwordChangedAt
       │
       ├─► RBAC checks                   ← requireAdmin / canViewAll / canEditOthers
       │
       ├─► Zod validation                ← Input validation
       │
       └─► Business logic + DB ops       ← Drizzle ORM queries
```

### 5.2 Authentication Flow

```
┌─────────┐    POST /api/auth/callback/credentials    ┌──────────┐
│  Client  │ ───────────────────────────────────────► │  NextAuth │
│  Browser │                                           │  Handler  │
└────┬─────┘                                           └────┬─────┘
     │                                                      │
     │    1. Look up user by email                           │
     │    2. Compare password with bcrypt                    │
     │    3. Create JWT with id, role, canViewAll, iat       │
     │    4. Set session cookie (SameSite=Strict)            │
     │                                                      │
     │    ◄──── Set-Cookie: next-auth.session-token=JWT ──► │
     │                                                      │
     │    Subsequent requests:                               │
     │    Cookie: next-auth.session-token=JWT               │
     │    Origin/Referer header (for mutations)              │
     │                                                      │
```

### 5.3 Route Wrapper Pattern

All authenticated API routes use a `withAuth` wrapper to reduce boilerplate:

```typescript
// src/lib/api-utils.ts
export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();
      if (options?.requireAdmin && session.user.role !== 'admin') throw ApiErrors.Forbidden();
      // Check if session was issued before last password change
      if (session.user.passwordChangedAt > 0 && session.user.iat < session.user.passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }
      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
```

This eliminates repetitive auth, session revocation, and error handling boilerplate from every route.

### 5.4 Response Format

All API responses use JSON:
```typescript
// Success
{ items: [...], pagination: { page, pageSize, total, totalPages } }

// Error
{ error: "Error message", code?: "ERROR_CODE" }
```

### 5.5 Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| 400 | BAD_REQUEST | Validation failure |
| 401 | UNAUTHORIZED | Not authenticated |
| 403 | FORBIDDEN | Insufficient permissions |
| 403 | INVALID_ORIGIN | Origin/Referer mismatch (CSRF) |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Duplicate resource |
| 500 | — | Internal server error |

---

## 6. Security Architecture

### 6.1 Defense-in-Depth Layers

```
Layer 1: Network        │ Caddy TLS termination, Docker network isolation
Layer 2: Transport      │ HTTPS only, HTTP→HTTPS redirect
Layer 3: Headers        │ CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
Layer 4: Authentication │ NextAuth JWT, bcrypt password hashing
Layer 5: Authorization  │ Role-based access (admin, user + canViewAll)
Layer 6: CSRF           │ SameSite=Strict cookies + Origin/Referer verification
Layer 7: Rate Limiting  │ Caddy rate limiting (per-IP, configurable)
Layer 8: Session        │ JWT iat vs passwordChangedAt invalidation
Layer 9: Input          │ Zod validation on all inputs, LIKE injection escaping
Layer 10: File Upload   │ Type/size/extension validation, UUID filenames, path traversal check
```

### 6.2 Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' ['unsafe-eval' in dev];
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### 6.3 CSRF Protection (Simplified)

```
┌──────────────────────────────────────────────────────────────┐
│  For every POST/PUT/DELETE/PATCH request:                    │
│                                                              │
│  1. Check Origin or Referer header matches the server host   │
│     - If neither is present, reject with 403 INVALID_ORIGIN  │
│     - If present but doesn't match host, reject with 403     │
│                                                              │
│  2. Session cookies use SameSite=Strict                      │
│     - Prevents cross-site request submission entirely         │
│                                                              │
│  3. Auth routes (/api/auth/*) exempt (no session yet)        │
│  4. Setup routes exempt during initial setup                  │
└──────────────────────────────────────────────────────────────┘
```

This replaces the double-submit cookie pattern. No CSRF token endpoint, no CsrfProvider, no useCsrfToken hook, no timing-safe comparison. The combination of SameSite=Strict and Origin/Referer verification provides equivalent protection for a same-origin application.

---

## 7. Deployment Architecture

### 7.1 Docker Compose

```
┌─────────────────────────────────────────┐
│          Docker Compose Network          │
│          172.28.0.0/16 (frontend)       │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │    Caddy      │  │    Next.js App    │  │
│  │  Ports: 80,   │  │    Port: 3000     │  │
│  │    443, 8443  │──│    (internal)     │  │
│  │  TLS + Rate   │  │                   │  │
│  │   Limiting    │  │  Mounts:          │  │
│  └──────────────┘  │    /data → volume  │  │
│                     └──────────────────┘  │
│                                          │
│  Volume: ./data → /data (sqlite.db,      │
│                          uploads,         │
│                          backups)         │
└─────────────────────────────────────────┘
```

### 7.2 Caddy Rate Limiting

```caddyfile
:443 {
    tls {$TLS_CERT} {$TLS_KEY}
    reverse_proxy app:3000
    
    # Rate limiting
    rate_limit {
        zone auth_zone {
            key    {remote_host}
            events 5
            window 15m
        }
        zone api_zone {
            key    {remote_host}
            events 100
            window 15m
        }
    }
    
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

Rate limiting is configured in Caddy, not in the application. This removes the need for in-memory rate limiting code and the `TRUSTED_PROXIES` environment variable.

### 7.3 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_SECRET` | NextAuth JWT signing key | Required |
| `AUTH_URL` | NextAuth base URL | `https://inventory.cosmiccatvintage.com` |
| `NODE_ENV` | Environment mode | `production` in Docker |
| `DATABASE_PATH` | SQLite database path (dev only) | `sqlite.db` |
| `UPLOADS_PATH` | File uploads directory (dev only) | `uploads` |
| `BACKUPS_PATH` | Backup directory (dev only) | `backups` |
| `COOKIE_SECURE` | Force secure cookies | `true` in production |

> **Removed from v1:** `TRUSTED_PROXIES` (no longer needed — rate limiting is in Caddy).

### 7.4 Container Startup

```bash
# entrypoint.sh
node scripts/migrate.js    # Run pending migrations
exec node server.js         # Start Next.js standalone server
```

### 7.5 Backup Strategy

- `scripts/backup.sh`: Gzip-compressed SQLite backup with 7-day retention.
- Scheduled via cron (2 AM) inside container or external scheduler.
- API-based backup (`GET /api/admin/backup`) exports all tables as JSON.
- Restore via `POST /api/admin/restore` with Zod validation.

---

## 8. Testing Architecture

### 8.1 Test Types

| Type | Runner | Scope | DB |
|------|--------|-------|----|
| Unit | Vitest | Pure logic (financial, validation, constants) | None/mocked |
| Functional | Vitest | Real DB operations, status transitions, auth flows | Isolated SQLite per suite |
| Integration | Vitest | Full API routes with mocked sessions | Isolated SQLite |
| E2E | Playwright | Browser automation against dev server | Seeded DB |

### 8.2 Test Isolation

- Functional/integration tests use `tests/setup/db.ts` to create timestamped databases.
- Each suite calls `cleanupTestDb()` in `afterEach`.

---

## 9. RBAC Design

### 9.1 Role Permission Matrix

| Action | admin | user (canViewAll) | user (default) |
|--------|-------|--------------------|----------------|
| View own inventory | ✅ | ✅ | ✅ |
| View all inventory | ✅ | ✅ | ❌ |
| Edit own inventory | ✅ | ✅ | ✅ |
| Edit others' inventory | ✅ | ❌ | ❌ |
| Delete own inventory | ✅ | ✅ | ✅ |
| Delete others' inventory | ✅ | ❌ | ❌ |
| View own sales | ✅ | ✅ | ✅ |
| View all sales | ✅ | ✅ | ❌ |
| Record sale for own item | ✅ | ✅ | ✅ |
| Record sale for any item | ✅ | ✅ | ❌ |
| View own mileage | ✅ | ✅ | ✅ |
| View all mileage | ✅ | ✅ | ❌ |
| Edit others' mileage | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Admin settings | ✅ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ |
| View reports (own data) | ✅ | ✅ | ✅ |
| View reports (all data) | ✅ | ✅ | ❌ |

### 9.2 Authorization Helper Functions

```typescript
canViewAllData(session): session.user.role === 'admin' || session.user.canViewAll === true
canEditOthersData(session): session.user.role === 'admin'
canManageUsers(session): session.user.role === 'admin'
canAccessResource(resourceOwnerId, currentUserId, session, operation):
  admin → always true
  canViewAll + read → always true
  canViewAll + write → only own data
  default → only own data
```

---

## 10. Financial Calculation

### 10.1 Single Source of Truth

The profit formula exists **only in TypeScript** (`src/lib/financial.ts`). The reports endpoint fetches raw sale data and computes aggregates using this function. There is no duplicate SQL formula.

```typescript
profit = (soldPrice + (shippingCollected || 0))
        - (salesTax || 0)
        - (platformFees || 0)
        - (refundAmount || 0)
        - purchasePrice
        - (shippingCost || 0);
```

### 10.2 Sales Tax Calculation

```typescript
calculateSalesTaxFromPrice(price, rate) = price - (price / (1 + rate))
// Default rate: 0.0825 (8.25%), stored in app_config table
```