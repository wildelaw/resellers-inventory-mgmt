# Resell Inventory Manager — AI Agent Build Prompt

> **Purpose:** This prompt instructs an AI coding agent to read the specification documents and generate the complete Resell Inventory Manager application from scratch, using the **simplified v2 architecture**.

---

You are tasked with building the **Resell Inventory Manager** — a self-hosted, single-tenant web application for resellers to track inventory purchases, sales, profitability, and mileage. The application uses Next.js 16 (App Router), React 19, SQLite via Drizzle ORM, NextAuth v5, and Tailwind CSS 4. It is deployed as a Docker container behind a Caddy reverse proxy with TLS termination and rate limiting.

## KEY SIMPLIFICATIONS FROM V1

This v2 spec significantly simplifies the v1 architecture. **Read these changes carefully:**

1. **RBAC: 2 roles + canViewAll toggle** instead of 3 roles. `admin` and `user` only. Users have a `canViewAll` boolean that replaces the `power_user` role.

2. **No CSRF token system.** CSRF protection is via `SameSite=Strict` cookies + Origin/Referer header verification. No `/api/csrf-token` endpoint, no `CsrfProvider`, no `useCsrfToken` hook.

3. **No session revocation table.** Session invalidation uses a `passwordChangedAt` column on `users`. JWTs with `iat < passwordChangedAt` are rejected. No `revoked_tokens` table.

4. **No account lockout.** Brute force protection is handled by Caddy rate limiting (5 requests/15 min per IP). No `failed_login_attempts` or `locked_until` columns.

5. **No rate limiting in app code.** Rate limiting is configured in `Caddyfile`, not in the application. No `rate-limit.ts` module.

6. **Profit formula: single source of truth.** Only in `src/lib/financial.ts`. No duplicate SQL formula. Reports compute aggregates in TypeScript.

7. **No auto-creation of $0 sales.** Donated/discarded items set `removalDate` but do NOT create phantom sale records.

8. **Settings as single-row `app_config` table** instead of key-value `settings` table.

9. **Removed database tables:** `sessions`, `accounts`, `verification_tokens`, `revoked_tokens`.

10. **API route wrapper (`withAuth`)** eliminates repetitive auth/CSRF/revocation/error handling boilerplate.

11. **Server Components for data pages** instead of client-side `useEffect` + `fetch` for reads.

12. **No Kubernetes manifests.** Docker Compose only.

---

### STEP 1: READ ALL SPECIFICATION DOCUMENTS

Read these specification files **in this exact order**, completely, before writing any code:

```
docs/REQUIREMENTS.md      — What to build (simplified v2 requirements)
docs/ARCHITECTURE.md      — How it's structured (simplified schema, auth, API)
docs/DESIGN.md            — How each feature works (simplified flows, RBAC, CSRF)
docs/IMPLEMENTATION.md     — How to write the code (configs, patterns, route wrapper)
docs/API_REFERENCE.md     — Every endpoint (updated for v2)
docs/UI_SPECIFICATION.md  — Every page (simplified, no CsrfProvider)
docs/OPERATIONS.md        — Deployment, backup, monitoring (Caddy rate limiting)
docs/TEST_STRATEGY.md     — What tests to write (updated for v2)
```

After reading all documents, confirm your understanding of:
1. The simplified database schema (6 tables instead of 9, `can_view_all` instead of `power_user`)
2. The Origin/Referer CSRF pattern (no token, no provider, no hook)
3. The `withAuth` route wrapper pattern
4. The `passwordChangedAt` session invalidation pattern
5. The single-source profit formula (TypeScript only, no SQL)
6. The `app_config` table replacing key-value settings

### STEP 2: PROJECT INITIALIZATION

Create the project as specified in IMPLEMENTATION.md section 1. Key configuration files:
- `next.config.ts` with security headers and CSP
- `tsconfig.json` with strict mode and `@/*` path alias
- `drizzle.config.ts` pointing to `./src/lib/schema.ts`
- `vitest.config.ts` with jsdom environment and test isolation
- `postcss.config.mjs` with Tailwind
- `Caddyfile` with TLS and rate limiting

### STEP 3: CORE LIBRARY LAYER

Build bottom-up in this order (each module depends on the previous):

1. `src/lib/config.ts` — Centralized configuration (no rate limit config)
2. `src/lib/constants.ts` — Item statuses, role labels (admin/user only), allowed transitions
3. `src/lib/schema.ts` — Drizzle schema with 6 tables: `users` (with `can_view_all`, `password_changed_at`; without `failed_login_attempts`, `locked_until`), `items`, `sales`, `photos`, `mileage`, `app_config`
4. `src/lib/db.ts` — Lazy database connection via Proxy pattern with PRAGMA configuration
5. `src/lib/financial.ts` — `calculateProfit()`, `calculateNetRevenue()`, `calculateSalesTaxFromPrice()` (single source of truth)
6. `src/lib/utils.ts` — `formatCurrency()`, `formatDate()`, `getPhotoUrl()`
7. `src/lib/api-errors.ts` — `ApiError` class, `ApiErrors` factory (including `InvalidOrigin`), `handleApiError()`
8. `src/lib/api-utils.ts` — **`withAuth()`** route wrapper, **`validateOriginOrReferer()`**, `parsePagination()`, `parseSortParams()`, `escapeLike()`
9. `src/lib/validations.ts` — All Zod schemas (userRole is admin/user only, includes `canViewAll`)
10. `src/lib/auth.ts` — NextAuth v5 with Credentials provider, JWT strategy, `canViewAll` and `iat` in callbacks. **No account lockout logic.**
11. `src/lib/auth-utils.ts` — Server-side auth helpers: `requireAuth()`, `requireAdmin()`, `canViewAllData()`, `canEditOthersData()`, `canManageUsers()`
12. `src/lib/db-init.ts` — `getSetupStatus()` using `app_config` table
13. `src/lib/migrate.ts` — In-app migration runner
14. `src/lib/csv-parser.ts` — PapaParse wrapper, column mapping
15. `src/lib/csv.ts` — Sales CSV export
16. `src/lib/backup.ts` — Zod validation schemas for 6 tables, restore logic

**Modules NOT to create** (removed from v1):
- `csrf.ts` — replaced by `validateOriginOrReferer()` in `api-utils.ts`
- `csrf-provider.tsx` — no CSRF token needed
- `useCsrfToken.ts` — no CSRF token needed
- `api-middleware.ts` — merged into `api-utils.ts`
- `rate-limit.ts` — moved to Caddy
- `session-revocation.ts` — replaced by `passwordChangedAt`
- `api-auth.ts` — merged into `auth-utils.ts`

### STEP 4: DATABASE MIGRATIONS

Generate the initial migration from the schema:
```bash
npx drizzle-kit generate
```

### STEP 5: API ROUTES

Implement all API routes using the `withAuth` wrapper pattern:

```typescript
// Pattern for all authenticated routes:
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    // ... validation and business logic
  });
}

// Pattern for admin-only routes:
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    // ... admin-only logic
  }, { requireAdmin: true });
}
```

**Complete API route list** (see API_REFERENCE.md for full details):

1. `GET /api/health` — Health check
2. `POST /api/auth/[...nextauth]` — NextAuth handlers
3. `GET /api/setup` — Setup status
4. `POST /api/setup` — Create admin
5. `PUT /api/setup` — Restore backup (admin)
6. `GET /api/inventory` — List items
7. `POST /api/inventory` — Create item
8. `GET /api/inventory/[id]` — Get item
9. `PUT /api/inventory/[id]` — Update item
10. `DELETE /api/inventory/[id]` — Delete item
11. `POST /api/inventory/[id]/photo` — Upload photo
12. `DELETE /api/inventory/[id]/photo` — Delete photo
13. `PATCH /api/inventory/bulk` — Bulk status change
14. `DELETE /api/inventory/bulk` — Bulk delete
15. `GET /api/sales` — List sales
16. `POST /api/sales` — Create sale
17. `PATCH /api/sales` — Process refund
18. `GET /api/sales/[id]` — Get sale
19. `PUT /api/sales/[id]` — Update sale
20. `DELETE /api/sales/[id]` — Delete sale
21. `GET /api/mileage` — List mileage
22. `POST /api/mileage` — Create mileage
23. `GET /api/mileage/[id]` — Get mileage
24. `PUT /api/mileage/[id]` — Update mileage
25. `DELETE /api/mileage/[id]` — Delete mileage
26. `GET /api/mileage/reports` — Mileage reports
27. `GET /api/mileage/export` — CSV export
28. `GET /api/reports` — Dashboard stats (TypeScript-only profit computation)
29. `POST /api/import` — CSV import
30. `GET /api/photos/[itemId]/[filename]` — Serve photo
31. `GET /api/profile` — Get profile
32. `PUT /api/profile` — Update profile/password
33. `GET /api/settings` — Get settings
34. `PUT /api/settings` — Update settings (admin)
35. `GET /api/admin/users` — List users
36. `POST /api/admin/users` — Create user
37. `GET /api/admin/users/[id]` — Get user
38. `PUT /api/admin/users/[id]` — Update user
39. `DELETE /api/admin/users/[id]` — Delete user
40. `POST /api/admin/users/[id]/reset-password` — Reset password
41. `GET /api/admin/backup` — Export backup
42. `POST /api/admin/restore` — Restore backup
43. `POST /api/admin/setup-unlock` — Re-open setup

**Removed endpoints from v1:**
- `GET /api/csrf-token` — replaced by Origin/Referer verification
- `POST /api/admin/users/[id]/revoke-sessions` — replaced by password reset
- `DELETE /api/admin/delete-inventory` — debug-only, removed
- `DELETE /api/admin/delete-sales` — debug-only, removed

### STEP 6: MIDDLEWARE

Create `src/proxy.ts` — Next.js middleware that:
1. Allows public paths (`/setup`, `/login`, `/api/auth/*`, `/api/health`, `/api/setup`)
2. Checks setup status via `getSetupStatus()`
3. Redirects to `/setup` if setup needed
4. Otherwise allows through

### STEP 7: REACT COMPONENTS AND PAGES

Build all UI components and pages following UI_SPECIFICATION.md.

**Key difference from v1:** No `CsrfProvider` wrapping. No `useCsrfToken` hook. Mutation requests are plain `fetch()` calls with no CSRF token header. The browser's automatic `Origin` header handles CSRF protection.

**Server Components for data pages:** Where possible, use Server Components (e.g., `page.tsx` in inventory, sales, reports) that directly query the database. Client components are only for interactive elements (forms, modals, filters).

**Shared Components:**
1. `src/lib/session-provider.tsx` — NextAuth SessionProvider wrapper
2. `src/hooks/useSaleForm.ts` — Sale form state with auto-tax calculation
3. `src/components/header.tsx` — Navigation with role-based links
4. `src/components/ConfirmModal.tsx` — Confirmation dialog
5. `src/components/SaleFormFields.tsx` — Reusable sale form fields
6. `src/components/SalesEntryModal.tsx` — Sale creation/edit modal
7. `src/components/RefundEntryModal.tsx` — Refund processing modal
8. `src/components/UserModals.tsx` — Admin user modals (with `canViewAll` checkbox)

**Pages (all `'use client'` unless noted as Server Component):**
1. `src/app/layout.tsx` — Root layout with SessionProvider only (no CsrfProvider)
2. `src/app/globals.css` — Tailwind base styles
3. `src/app/page.tsx` — **Server Component** — Dashboard with stats
4. `src/app/login/page.tsx` — Login form
5. `src/app/setup/page.tsx` — Setup flow
6. `src/app/inventory/page.tsx` — **Server Component** for initial data + Client Component for interactivity
7. `src/app/inventory/new/page.tsx` — New item form
8. `src/app/inventory/[id]/page.tsx` — Item detail
9. `src/app/inventory/[id]/edit/page.tsx` — Item edit form
10. `src/app/sales/page.tsx` — **Server Component** for initial data + Client Component
11. `src/app/sales/new/page.tsx` — Record sale form
12. `src/app/sales/[id]/page.tsx` — Sale detail with refund
13. `src/app/mileage/page.tsx` — Mileage list
14. `src/app/mileage/new/page.tsx` — New mileage entry
15. `src/app/mileage/[id]/edit/page.tsx` — Edit mileage
16. `src/app/imports/page.tsx` — CSV import
17. `src/app/reports/page.tsx` — **Server Component** for report data
18. `src/app/profile/page.tsx` — Profile and password
19. `src/app/admin/users/page.tsx` — User management (with `canViewAll` toggle)
20. `src/app/admin/settings/page.tsx` — Settings, backup/restore

### STEP 8: SEED SCRIPT

Create `src/scripts/seed.ts` — Creates admin user with `canViewAll: true` and `passwordChangedAt: 0`.

### STEP 9: GENERATE MIGRATIONS AND VERIFY

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
npm run dev
```

### STEP 10: WRITE TESTS

Following TEST_STRATEGY.md, implement tests. **Key v2 differences:**

- **No CSRF tests** — replaced by Origin/Referer validation tests
- **No rate-limit tests** — handled by Caddy
- **No session revocation tests** — replaced by `passwordChangedAt` invalidation tests
- **No account lockout tests** — removed
- **No profit consistency test** — single source of truth
- **RBAC tests use 2 roles + canViewAll** — not 3 roles

**Unit Tests** (`tests/unit/`):
1. `constants.test.ts` — Status transitions, role labels
2. `financial.test.ts` — Profit calculation
3. `api-utils.test.ts` — `validateOriginOrReferer()` (Origin match, mismatch, missing, Referer fallback, method filtering, auth exemption)
4. `validations.test.ts` — All Zod schemas including `canViewAll`
5. `validation-security.test.ts` — XSS, oversized inputs, negative prices
6. `api-auth.test.ts` — RBAC helpers for admin, user+canViewAll, user
7. `csv-parser.test.ts` — CSV parsing, column mapping

**Functional Tests** (`tests/functional/`):
1. `workflows/status-transitions.test.ts` — Valid/invalid transitions, side effects
2. `workflows/sale-refund-flow.test.ts` — Sale creation, refund flows
3. `workflows/inventory-removal-date.test.ts` — removalDate auto-set/clear
4. `financial/refund-impact.test.ts` — Refund amounts
5. `auth/setup-lock.test.ts` — Setup lock/unlock
6. `auth/password-invalidation.test.ts` — `passwordChangedAt` session rejection
7. `backup/restore-validation.test.ts` — Valid/invalid backups

**Integration Tests** (`tests/integration/api/`):
1. `inventory/route.test.ts` — List, create, filter, RBAC
2. `inventory/[id].test.ts` — Get, update, delete, RBAC
3. `inventory/bulk/route.test.ts` — Bulk status, bulk delete
4. `sales/route.test.ts` — List, create, refund
5. `sales/[id].test.ts` — Get, update, delete
6. `reports.test.ts` — Stats, date filtering, RBAC
7. `import.test.ts` — Import flows
8. `authorization.test.ts` — RBAC for all role combinations
9. `origin-validation.test.ts` — Origin/Referer validation on mutations

**E2E Tests** (`tests/e2e/`):
1. `auth.spec.ts` — Login, logout
2. `inventory.spec.ts` — CRUD operations
3. `sales.spec.ts` — Sale creation, refund
4. `rbac.spec.ts` — User sees own data, canViewAll user sees all, admin manages all
5. `import.spec.ts` — CSV import

### STEP 11: VERIFY CRITICAL BEHAVIORS

1. **Origin/Referer validation**: Every POST/PUT/DELETE/PATCH must verify Origin matches AUTH_URL. Missing Origin → 403. Mismatched Origin → 403. GET/HEAD/OPTIONS → skip check.

2. **Session invalidation**: When `passwordChangedAt > 0` and `jwt.iat < passwordChangedAt`, reject the request with 401.

3. **RBAC**: `admin` can do everything. `user` with `canViewAll=true` can view all data but only edit own. `user` with `canViewAll=false` can only see/edit own data.

4. **Status transitions**: `available → [listed, sold, donated, discarded]`, `listed → [available, sold, donated, discarded]`, `sold → [returned]`, `returned → [available]`. Donated and discarded are terminal.

5. **No $0 auto-sales**: When status changes to `donated` or `discarded`, only `removalDate` is set. No sale record is created.

6. **Profit formula single source**: `calculateProfit()` in `financial.ts` is the ONLY implementation. The reports endpoint uses it to compute aggregates from raw data. There is no SQL formula.

7. **`app_config` table**: Single row with typed columns. `setup_complete` is a boolean column, not a setting key.

8. **`withAuth` wrapper**: All authenticated routes use `withAuth()` which handles auth, session invalidation, and error handling. Origin/Referer validation is called separately for mutations.

9. **Production paths**: `/data/sqlite.db`, `/data/uploads`, `/data/backups` when `NODE_ENV=production`.

10. **Caddy rate limiting**: Auth endpoints limited to 5 requests per 15 min per IP. API mutations limited to 100 per 15 min per IP.

### STEP 12: DOCKER BUILD AND VERIFICATION

1. Build: `docker compose build`
2. Start: `docker compose --profile https up -d`
3. Verify: `curl -k https://localhost/api/health`
4. Test setup flow, create admin, login, verify dashboard

### IMPORTANT REMINDERS

- **No CSRF token system.** Origin/Referer verification replaces it. No `/api/csrf-token`, no `CsrfProvider`, no `useCsrfToken`.
- **No `revoked_tokens` table.** `passwordChangedAt` on `users` handles session invalidation.
- **No `sessions`, `accounts`, `verification_tokens` tables.** These were unused in v1.
- **No `power_user` role.** Use `user` + `canViewAll` boolean.
- **No account lockout.** Caddy handles rate limiting.
- **No in-app rate limiter.** No `rate-limit.ts`, no `TRUSTED_PROXIES` env var.
- **No auto-creation of $0 sales** for donated/discarded items.
- **No profit formula in SQL.** Only in `src/lib/financial.ts`.
- **No `settings` key-value table.** Use `app_config` single-row table.
- **No Kubernetes manifests.** Docker Compose only.
- **Use Server Components** for data pages. Client components only for interactivity.
- **Use `withAuth()` wrapper** for all authenticated API routes.