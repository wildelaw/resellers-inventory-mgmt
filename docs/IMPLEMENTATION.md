# Resell Inventory Manager — Implementation Specification

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified implementation specification for the Resell Inventory Manager application.

---

## 1. Prerequisites & Initialization

### 1.1 Project Initialization

```bash
npx create-next-app@latest resell-inv-mgmt --typescript --tailwind --eslint --app --src-dir
cd resell-inv-mgmt
```

### 1.2 Dependencies

```json
{
  "dependencies": {
    "@tailwindcss/postcss": "^4",
    "bcrypt": "^6.0.0",
    "better-sqlite3": "^12.8.0",
    "drizzle-orm": "^0.45.2",
    "next": "16.2.6",
    "next-auth": "^5.0.0-beta.30",
    "papaparse": "^5.5.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "tailwindcss": "^4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@playwright/test": "^1.59.1",
    "@testing-library/react": "^16.3.2",
    "@types/bcrypt": "^6.0.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^20",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitest/coverage-v8": "^4.1.2",
    "drizzle-kit": "^0.31.10",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "jsdom": "^29.0.1",
    "typescript": "^5",
    "vitest": "^4.1.2"
  }
}
```

Note: No changes to core dependencies from v1 (CSRF/rate-limit modules were custom code, not packages).

### 1.3 Configuration Files

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, '').trim() },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  headers: async () => [{
    source: '/(.*)',
    headers: securityHeaders,
  }],
};

export default nextConfig;
```

#### `drizzle.config.ts`
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: './sqlite.db' },
});
```

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup/env.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
    pool: 'forks',
    singleFork: true,
    globalSetup: ['tests/setup/global-teardown.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

#### `postcss.config.mjs`
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

---

## 2. Database Implementation

### 2.1 Schema Definition (`src/lib/schema.ts`)

Define all tables using Drizzle ORM's `sqliteTable` builder. Key changes from v1:

- **`users`**: Role is `admin` or `user` (no `power_user`). Added `can_view_all` (boolean, default 0). Added `password_changed_at` (integer, default 0). Removed `failed_login_attempts` and `locked_until`.
- **`app_config`**: New single-row table replacing key-value `settings`. Typed columns: `company_name`, `company_tagline`, `sales_tax_rate`, `setup_complete`.
- **Removed tables**: `sessions`, `accounts`, `verification_tokens`, `revoked_tokens`.
- All other tables (`items`, `sales`, `photos`, `mileage`) unchanged.

Export type aliases: `type User = typeof users.$inferSelect`, `type NewUser = typeof users.$inferInsert`, etc.

### 2.2 Database Connection (`src/lib/db.ts`)

Unchanged from v1 — lazy initialization via Proxy pattern.

### 2.3 Migrations

Same approach as v1. The v1→v2 migration adds/removes columns and tables as described in DESIGN.md section 14.

---

## 3. Core Library Implementation

### 3.1 Configuration (`src/lib/config.ts`)

```typescript
export const config = {
  database: {
    path: process.env.NODE_ENV === 'production' 
      ? '/data/sqlite.db' 
      : (process.env.DATABASE_PATH || 'sqlite.db'),
  },
  uploads: {
    path: process.env.NODE_ENV === 'production'
      ? '/data/uploads'
      : (process.env.UPLOADS_PATH || 'uploads'),
  },
  backups: {
    path: process.env.NODE_ENV === 'production'
      ? '/data/backups'
      : (process.env.BACKUPS_PATH || 'backups'),
  },
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  },
} as const;
```

Note: Removed `rateLimit` section — rate limiting is handled by Caddy.

### 3.2 Constants (`src/lib/constants.ts`)

```typescript
export type UserRole = 'admin' | 'user';
export type ItemStatus = 'available' | 'listed' | 'sold' | 'returned' | 'donated' | 'discarded';

export const ROLE_LABELS: Record<UserRole, string> = { 
  admin: 'Administrator', 
  user: 'Standard User' 
};
export const DEFAULT_SALES_TAX_RATE = 0.0825;
export const ALL_STATUSES: ItemStatus[] = ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'];
export const STATUS_LABELS: Record<ItemStatus, string> = { ... };
export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  available: ['listed', 'sold', 'donated', 'discarded'],
  listed:    ['available', 'sold', 'donated', 'discarded'],
  sold:      ['returned'],
  returned:  ['available'],
  donated:   [],
  discarded: [],
};

export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean { ... }
export function getAllowedTransitions(currentStatus: ItemStatus): ItemStatus[] { ... }
```

### 3.3 Financial Calculations (`src/lib/financial.ts`)

Unchanged from v1 — this is the **single source of truth** for the profit formula.

### 3.4 Validation (`src/lib/validations.ts`)

All Zod schemas. Key changes from v1:
- `userRoleSchema`: `z.enum(['admin', 'user'])` (no `power_user`)
- `createUserSchema`: includes `canViewAll: z.boolean().optional().default(false)`
- `updateUserSchema`: includes `canViewAll: z.boolean().optional()`

### 3.5 Authentication (`src/lib/auth.ts`)

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: { 
        email: { label: 'Email', type: 'email' }, 
        password: { label: 'Password', type: 'password' } 
      },
      authorize: async (credentials) => {
        // 1. Look up user by email
        // 2. Compare password with bcrypt
        // 3. Check is_active
        // 4. On success: update lastLogin, return { id, email, name, role, canViewAll }
        // 5. On failure: return null (rate limiting at Caddy level prevents brute force)
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: config.auth.sessionMaxAge },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) { 
        token.id = user.id; 
        token.role = user.role; 
        token.canViewAll = user.canViewAll; 
        // iat is automatically included in JWT
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session?.user) {
        session.user.id = token?.id ?? token?.sub ?? '';
        session.user.role = token?.role as UserRole ?? 'user';
        session.user.canViewAll = token?.canViewAll === true;
        session.user.iat = token?.iat as number ?? 0;
      }
      return session;
    },
  },
  pages: { signIn: '/login' },
});
```

Augment `next-auth` types for `Session.user` to include `id`, `role`, `canViewAll`, and `iat`.

Note: **No account lockout logic** — Caddy rate limiting (5 requests/15 min per IP) prevents brute force. No dummy hash comparison needed.

### 3.6 API Error Handling (`src/lib/api-errors.ts`)

Unchanged from v1, but add:

```typescript
export const ApiErrors = {
  Unauthorized: (message?: string) => new ApiError(401, message || 'Unauthorized', 'UNAUTHORIZED'),
  Forbidden: () => new ApiError(403, 'Forbidden', 'FORBIDDEN'),
  NotFound: (resource?: string) => new ApiError(404, resource ? `${resource} not found` : 'Not found', 'NOT_FOUND'),
  BadRequest: (message: string) => new ApiError(400, message, 'BAD_REQUEST'),
  Conflict: (message: string) => new ApiError(409, message, 'CONFLICT'),
  InvalidOrigin: () => new ApiError(403, 'Invalid or missing Origin header', 'INVALID_ORIGIN'),
};
```

### 3.7 API Route Wrapper (`src/lib/api-utils.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server/server';
import { auth } from './auth';
import { handleApiError, ApiErrors } from './api-errors';

/**
 * Validate Origin or Referer header for state-changing requests.
 * Prevents CSRF by ensuring requests come from the same origin.
 */
export function validateOriginOrReferer(req: NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return null; // Only check mutations
  }
  
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');
  const authUrl = process.env.AUTH_URL || `https://${host}`;
  
  if (!origin && !referer) {
    return NextResponse.json({ error: 'Missing Origin and Referer headers', code: 'INVALID_ORIGIN' }, { status: 403 });
  }
  
  const source = origin || referer;
  try {
    const sourceUrl = new URL(source);
    const authUrlObj = new URL(authUrl);
    if (sourceUrl.origin !== authUrlObj.origin) {
      return NextResponse.json({ error: 'Invalid Origin header', code: 'INVALID_ORIGIN' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid Origin header', code: 'INVALID_ORIGIN' }, { status: 403 });
  }
  
  return null; // Valid
}

/**
 * Wraps an API route handler with authentication, session validation, and error handling.
 * Eliminates repetitive boilerplate from every route.
 */
export function withAuth(
  handler: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }, session: Session) => Promise<NextResponse>,
  options?: { requireAdmin?: boolean }
) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => {
    try {
      const session = await auth();
      if (!session?.user) throw ApiErrors.Unauthorized();
      
      // Check if session was issued before last password change
      if (session.user.passwordChangedAt > 0 && 
          (session.user.iat || 0) < session.user.passwordChangedAt) {
        throw ApiErrors.Unauthorized('Session invalidated');
      }
      
      if (options?.requireAdmin && session.user.role !== 'admin') {
        throw ApiErrors.Forbidden();
      }
      
      return await handler(req, ctx, session);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Pagination, sorting, and LIKE escaping utilities
export function parsePagination(searchParams: URLSearchParams) { ... }
export function parseSortParams(searchParams: URLSearchParams, allowedFields: string[], defaultField: string) { ... }
export function escapeLike(input: string): string { ... }
```

### 3.8 Auth Utilities (`src/lib/auth-utils.ts`)

```typescript
import { auth } from './auth';
import { ApiErrors } from './api-errors';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();
  // Check session invalidation
  if (session.user.passwordChangedAt > 0 && 
      (session.user.iat || 0) < session.user.passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

// RBAC helpers
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}
```

### 3.9 Removed Modules

The following modules from v1 are **removed**:

| Module | Reason |
|--------|--------|
| `csrf.ts` | Replaced by `validateOriginOrReferer()` in `api-utils.ts` |
| `csrf-provider.tsx` | No CSRF token needed — browsers send Origin automatically |
| `useCsrfToken.ts` | No CSRF token needed |
| `api-middleware.ts` | CSRF and rate limiting removed; `withAuth()` in `api-utils.ts` handles auth |
| `rate-limit.ts` | Moved to Caddy configuration |
| `session-revocation.ts` | Replaced by `passwordChangedAt` check in `withAuth()` |
| `api-auth.ts` | Merged into `auth-utils.ts` |

---

## 4. API Route Implementation

### 4.1 Route Pattern

Every API route uses the `withAuth` wrapper:

```typescript
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { createItemSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    
    const body = await req.json();
    const validation = createItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    }
    
    const item = await db.insert(items).values({
      ...validation.data,
      ownerId: session.user.id,
      status: 'available',
    }).returning();
    
    return NextResponse.json(item[0], { status: 201 });
  });
}
```

This replaces the v1 pattern of manually calling `auth()`, `withCsrfProtection()`, `checkSessionRevocation()`, and `handleApiError()` in every route.

### 4.2 Complete API Route Table

| Method | Path | Auth | Origin Check | RBAC | Purpose |
|--------|------|------|-------------|------|---------|
| GET | `/api/health` | ❌ | ❌ | — | Health check |
| GET | `/api/setup` | ❌ | ❌ | — | Check setup status |
| POST | `/api/setup` | ❌ | ❌ | — | Create admin (if no users) |
| PUT | `/api/setup` | ✅ | ✅ | admin | Restore from backup |
| POST | `/api/auth/[...nextauth]` | ❌ | ❌ | — | NextAuth handler |
| GET | `/api/inventory` | ✅ | ❌ | role-filtered | List items |
| POST | `/api/inventory` | ✅ | ✅ | — | Create item |
| GET | `/api/inventory/[id]` | ✅ | ❌ | owner/admin/canViewAll | Get item |
| PUT | `/api/inventory/[id]` | ✅ | ✅ | owner/admin | Update item |
| DELETE | `/api/inventory/[id]` | ✅ | ✅ | owner/admin | Delete item |
| POST | `/api/inventory/[id]/photo` | ✅ | ✅ | owner | Upload photo |
| DELETE | `/api/inventory/[id]/photo` | ✅ | ✅ | owner | Delete photo |
| PATCH | `/api/inventory/bulk` | ✅ | ✅ | owner | Bulk status change |
| DELETE | `/api/inventory/bulk` | ✅ | ✅ | owner | Bulk delete |
| GET | `/api/sales` | ✅ | ❌ | role-filtered | List sales |
| POST | `/api/sales` | ✅ | ✅ | — | Create sale |
| PATCH | `/api/sales` | ✅ | ✅ | owner/admin | Process refund |
| GET | `/api/sales/[id]` | ✅ | ❌ | owner/admin/canViewAll | Get sale |
| PUT | `/api/sales/[id]` | ✅ | ✅ | owner/admin | Update sale |
| DELETE | `/api/sales/[id]` | ✅ | ✅ | owner/admin | Delete sale |
| GET | `/api/mileage` | ✅ | ❌ | own only | List mileage |
| POST | `/api/mileage` | ✅ | ✅ | — | Create mileage |
| GET | `/api/mileage/[id]` | ✅ | ❌ | owner/admin/canViewAll | Get mileage |
| PUT | `/api/mileage/[id]` | ✅ | ✅ | owner/admin | Update mileage |
| DELETE | `/api/mileage/[id]` | ✅ | ✅ | owner/admin | Delete mileage |
| GET | `/api/mileage/export` | ✅ | ❌ | own only | CSV export |
| GET | `/api/mileage/reports` | ✅ | ❌ | own only | Mileage reports |
| GET | `/api/reports` | ✅ | ❌ | role-filtered | Dashboard stats |
| POST | `/api/import` | ✅ | ✅ | — | CSV import |
| GET | `/api/profile` | ✅ | ❌ | — | Get profile |
| PUT | `/api/profile` | ✅ | ✅ | — | Update profile/password |
| GET | `/api/settings` | ✅ | ❌ | — | Get all settings |
| PUT | `/api/settings` | ✅ | ✅ | admin | Update settings |
| GET | `/api/photos/[itemId]/[filename]` | ✅ | ❌ | owner/admin/canViewAll | Serve photo |
| GET | `/api/admin/users` | ✅ | ❌ | admin | List users |
| POST | `/api/admin/users` | ✅ | ✅ | admin | Create user |
| GET | `/api/admin/users/[id]` | ✅ | ❌ | admin | Get user |
| PUT | `/api/admin/users/[id]` | ✅ | ✅ | admin | Update user |
| DELETE | `/api/admin/users/[id]` | ✅ | ✅ | admin | Delete user |
| POST | `/api/admin/users/[id]/reset-password` | ✅ | ✅ | admin | Reset password |
| GET | `/api/admin/backup` | ✅ | ❌ | admin | Export backup |
| POST | `/api/admin/restore` | ✅ | ✅ | admin | Restore backup |
| POST | `/api/admin/setup-unlock` | ✅ | ✅ | admin | Re-open setup |

**Removed endpoints from v1:**
- `GET /api/csrf-token` — no longer needed (Origin/Referer replaces CSRF token)
- `POST /api/admin/users/[id]/revoke-sessions` — replaced by password reset (which updates `passwordChangedAt`)
- `DELETE /api/admin/delete-inventory` — debug-only, removed from spec
- `DELETE /api/admin/delete-sales` — debug-only, removed from spec

### 4.3 Reports Endpoint (Single Source of Truth)

```typescript
// GET /api/reports
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const { startDate, endDate } = parseDateFilters(req);
    
    // Fetch raw sales data
    const sales = await fetchSalesForUser(session, startDate, endDate);
    
    // Compute aggregates using TypeScript function (SINGLE SOURCE OF TRUTH)
    const totalProfit = sales.reduce((sum, sale) => 
      sum + calculateProfit(sale), 0);
    const totalNetRevenue = sales.reduce((sum, sale) => 
      sum + calculateNetRevenue(sale), 0);
    
    // Return computed results
    return NextResponse.json({
      profit: { totalProfit },
      sales: { totalNetRevenue, ... },
      ...
    });
  });
}
```

---

## 5. UI Implementation

### 5.1 Layout Structure (`src/app/layout.tsx`)

```tsx
<html lang="en" className="h-full antialiased">
  <body className="min-h-full flex flex-col">
    <SessionProvider>
      {children}
    </SessionProvider>
  </body>
</html>
```

Note: **No CsrfProvider** — Origin/Referer verification replaces the CSRF token system.

### 5.2 Server Components for Data Pages

Data display pages use **Server Components** that directly query the database:

```tsx
// src/app/inventory/page.tsx (Server Component)
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { redirect } from 'next/navigation';
import InventoryClient from './InventoryClient';

export default async function InventoryPage({ searchParams }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  
  const data = await db.query.items.findMany({
    where: canViewAllData(session) ? undefined : eq(items.ownerId, session.user.id),
    with: { photos: true, sales: true },
    ...parsePagination(searchParams),
  });
  
  return <InventoryClient initialData={data} />;
}
```

The client component (`InventoryClient`) handles only interactive features: filters, sorting, pagination, modals.

### 5.3 Mutation Pattern (Client Components)

For mutations, client components use `fetch()` with the browser's automatic Origin header:

```typescript
// No CSRF token needed — browser sends Origin header automatically
const res = await fetch('/api/inventory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

### 5.4 Key Components

Same component list as v1, minus `CsrfProvider` and `useCsrfToken`. All mutation calls remove the `x-csrf-token` header.

---

## 6. Docker Deployment

### 6.1 Dockerfile (Multi-stage)

Same as v1 — no changes needed.

### 6.2 docker-compose.yml

```yaml
services:
  app:
    build: { context: ., dockerfile: Dockerfile }
    container_name: resell-inv-mgmt
    restart: unless-stopped
    networks: [frontend]
    environment:
      - NODE_ENV=production
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_URL=${AUTH_URL:-https://inventory.cosmiccatvintage.com}
    volumes:
      - ./data:/data:rw,z
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=100m
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "-O", "/dev/null", "http://localhost:3000/api/health"]
      interval: 30s, timeout: 10s, retries: 3, start_period: 30s

  caddy:
    image: caddy:2-alpine
    container_name: resell-inv-mgmt-caddy
    restart: unless-stopped
    ports: ["80:80", "443:443", "8443:8443"]
    networks: [frontend]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./certs:/data/certs:ro
    environment:
      - TLS_CERT=${TLS_CERT:-/data/certs/uat.pem}
      - TLS_KEY=${TLS_KEY:-/data/certs/uat.key}
    profiles: [https]
    healthcheck:
      test: ["CMD", "nc", "-z", "localhost", "80"]
      interval: 30s, timeout: 10s, retries: 3, start_period: 10s

networks:
  frontend:
    driver: bridge
    ipam: { config: [{ subnet: "172.28.0.0/16" }] }
```

Note: **Removed `TRUSTED_PROXIES` env var** — no longer needed since rate limiting is in Caddy.

### 6.3 Caddyfile (with Rate Limiting)

```
{
    auto_https off
    debug
}

:443 {
    tls {$TLS_CERT} {$TLS_KEY}
    reverse_proxy app:3000
    
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

:8443 {
    tls {$TLS_CERT} {$TLS_KEY}
    reverse_proxy app:3000
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}

:80 {
    redir https://{host}{uri} permanent
}
```

### 6.4 Entrypoint and Backup Scripts

Same as v1 — no changes.

---

## 7. Testing Implementation

### 7.1 Test Structure

```
tests/
├── setup/
│   ├── db.ts              # createTestDb(), cleanupTestDb()
│   ├── env.ts             # Set NODE_ENV=test, mock env vars
│   └── global-teardown.ts # Cleanup temp DBs
├── unit/
│   ├── api-auth.test.ts           # RBAC helper function tests
│   ├── api-utils.test.ts          # validateOriginOrReferer() tests
│   ├── constants.test.ts          # Status transition validation
│   ├── financial.test.ts          # Profit calculation tests
│   ├── csv-parser.test.ts         # CSV parsing + column mapping
│   ├── validation-security.test.ts # Password complexity, input limits
│   ├── validations.test.ts        # Zod schema validation
│   └── components/
│       ├── RefundEntryModal.test.tsx
│       ├── SalesEntryModal.test.tsx
│       └── header.test.tsx
├── functional/
│   ├── auth/
│   │   └── setup-lock.test.ts
│   ├── backup/
│   │   └── restore-validation.test.ts
│   ├── financial/
│   │   └── refund-impact.test.ts
│   └── workflows/
│       ├── inventory-removal-date.test.ts
│       ├── sale-refund-flow.test.ts
│       └── status-transitions.test.ts
├── integration/
│   └── api/
│       ├── authorization.test.ts
│       ├── import.test.ts
│       ├── inventory/[id].test.ts
│       ├── inventory/bulk/route.test.ts
│       ├── inventory/route.test.ts
│       ├── reports.test.ts
│       ├── sales/[id].test.ts
│       └── sales/route.test.ts
└── e2e/
    ├── auth.spec.ts
    ├── import.spec.ts
    ├── inventory.spec.ts
    └── sales.spec.ts
```

### 7.2 Removed Test Files from v1

| File | Reason |
|------|--------|
| `unit/csrf.test.ts` | CSRF module removed |
| `unit/rate-limit.test.ts` | Rate limiting moved to Caddy |
| `unit/api-middleware.test.ts` | Middleware module removed |
| `functional/auth/account-lockout.test.ts` | Account lockout removed |
| `functional/auth/session-revocation.test.ts` | Session revocation removed |
| `functional/financial/profit-consistency.test.ts` | Single source of truth — no SQL formula to match |
| `integration/api/csrf-token.test.ts` | CSRF token endpoint removed |

### 7.3 Key Test Cases

#### Status Transitions (`tests/functional/workflows/status-transitions.test.ts`)
- Tests every valid transition from `ALLOWED_TRANSITIONS`.
- Tests that invalid transitions are rejected.
- Tests side effects (removalDate set/cleared).
- **No $0 sale auto-creation** for donated/discarded (unlike v1).

#### Origin/Referer Validation (`tests/unit/api-utils.test.ts`)
- Origin header matches host → allowed.
- Origin header doesn't match host → 403.
- No Origin or Referer → 403.
- GET/HEAD/OPTIONS requests → skipped.
- Auth endpoints exempt.

#### Session Invalidation (`tests/functional/auth/`)
- Password change updates `passwordChangedAt`.
- JWT with `iat` before `passwordChangedAt` → rejected.
- JWT with `iat` after `passwordChangedAt` → allowed.

#### Profit Calculation (`tests/unit/financial.test.ts`)
- Tests `calculateProfit()` with all null/zero combinations.
- **No SQL parity test needed** — single source of truth.

---

## 8. Seed Data

Same as v1, but user creation includes `canViewAll` field:

```typescript
await db.insert(users).values({
  email: 'security@lawsonsoft.com',
  passwordHash,
  name: 'Admin User',
  role: 'admin',
  canViewAll: true,
});
```

---

## 9. NPM Scripts

Same as v1.

---

## 10. Build & Deploy Steps

Same as v1, with these changes:
- No `TRUSTED_PROXIES` environment variable needed.
- Caddy configuration includes rate limiting.
- No `generate-self-signed-cert.sh` changes needed (still valid).