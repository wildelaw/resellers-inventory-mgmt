# Resell Inventory Manager — Design Specification

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified design specification for the Resell Inventory Manager application.

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| Single source of truth | `schema.ts` defines all data models; `config.ts` centralizes paths; `constants.ts` defines statuses and transitions; `financial.ts` is the sole profit formula |
| Defense in depth | Network → Transport → Headers → Auth → AuthZ → CSRF (SameSite+Origin) → Rate Limit (Caddy) → Session → Input → File Upload |
| Lazy initialization | Database connection via Proxy pattern — no connection until first query, enabling build without DB |
| Idempotent migrations | Migration runner uses content-hash + tag tracking; already-applied migrations are skipped |
| Transactional integrity | All multi-table mutations use SQLite transactions (sale+item status, refund+item status, user delete+data transfer, backup restore) |
| Fail-safe defaults | Default role is `user` (least privilege); `canViewAll` defaults to false; item status defaults to `available` |
| Minimal surface area | No unused database tables, no redundant security layers, no duplicate formula implementations |

---

## 2. Module Dependency Graph

```
                    ┌─────────────┐
                    │   config.ts │  (paths, auth settings)
                    └──────┬──────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                   │
    ┌────▼─────┐    ┌──────▼──────┐    ┌───────▼──────┐
    │  db.ts   │    │   auth.ts   │    │  (removed:    │
    │ (Proxy)  │    │ (NextAuth)  │    │   rate-limit,  │
    └────┬─────┘    └──────┬──────┘    │   csrf,        │
         │                 │           │   session-rev)  │
    ┌────▼─────┐    ┌──────▼──────┐    └───────────────┘
    │schema.ts │    │auth-utils.ts│
    │(Drizzle) │    │(requireAuth,│
    └────┬─────┘    │ requireAdmin│
         │           └─────────────┘
    ┌────▼──────────────────────────────────┐
    │                                        │
    │   All API routes & business logic      │
    │   (using withAuth wrapper)             │
    │                                        │
    └────────────────────────────────────────┘
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌───▼──────┐
    │validat- │   │financial  │  │constants  │
    │ions.ts  │   │.ts        │  │.ts        │
    │(Zod)    │   │(profit)   │  │(statuses) │
    └─────────┘   └───────────┘  └───────────┘
```

**Modules removed from v1:**
- `rate-limit.ts` — moved to Caddy configuration
- `csrf.ts` — replaced by Origin/Referer verification in `api-utils.ts`
- `csrf-provider.tsx` — no longer needed
- `session-revocation.ts` — replaced by `passwordChangedAt` column on `users`
- `api-middleware.ts` — CSRF and rate limiting removed; `withAuth` in `api-utils.ts` handles auth + session check

**Key dependency rules:**
- `schema.ts` has no dependencies on application code.
- `db.ts` depends only on `schema.ts` and `config.ts`.
- `auth.ts` depends on `db.ts`, `schema.ts`, `config.ts`, and `bcrypt`.
- API routes use `withAuth()` from `api-utils.ts` instead of manually calling auth + CSRF + session revocation.
- UI pages that display data use Server Components (direct DB queries) where possible.

---

## 3. Data Flow Designs

### 3.1 Item Creation Flow

```
Client                    Server
  │                         │
  │  POST /api/inventory   │
  │  {name, price, ...}    │
  │  Cookie: session        │
  │  Origin: https://host   │
  │────────────────────────►│
  │                         ├── withAuth() wrapper
  │                         │   ├── auth() ──► 401 if no session
  │                         │   ├── checkPasswordChanged ──► 401 if invalidated
  │                         │   └── RBAC check (any authenticated user)
  │                         ├── validateOriginOrReferer(req)
  │                         │   └── 403 if Origin/Referer missing or mismatched
  │                         ├── createItemSchema.safeParse(body)
  │                         ├── db.insert(items).values({...})
  │                         │   ownerId = session.user.id
  │                         │   status = 'available'
  │                         └── Return 201 + item JSON
  │◄────────────────────────│
  │  {item}                 │
```

### 3.2 Sale Creation with Item Status Update

```
Client                         Server
  │                              │
  │  POST /api/sales             │
  │  {itemId, soldPrice, ...}   │
  │─────────────────────────────►│
  │                              ├── withAuth() + validateOriginOrReferer()
  │                              ├── Verify item exists & not sold
  │                              ├── db.transaction((tx) => {
  │                              │     tx.insert(sales).values(...)
  │                              │     tx.update(items).set({status: 'sold'})
  │                              │   })
  │                              └── Return 201 + sale JSON
  │◄─────────────────────────────│
```

### 3.3 Refund Processing Flow

```
Client                              Server
  │                                   │
  │  PATCH /api/sales                  │
  │  {saleId, refundAmount,            │
  │   refundType, refundReason}        │
  │──────────────────────────────────►│
  │                                   ├── withAuth() + validateOriginOrReferer()
  │                                   ├── updateRefundSchema.safeParse()
  │                                   ├── Verify sale exists
  │                                   ├── db.transaction((tx) => {
  │                                   │     tx.update(sales).set({...})
  │                                   │     if (refundType === 'refund_with_return')
  │                                   │       tx.update(items).set({
  │                                   │         status: 'returned',
  │                                   │         removalDate: null
  │                                   │       })
  │                                   │   })
  │                                   └── Return updated sale + item
  │◄──────────────────────────────────│
```

### 3.4 Authentication Flow

```
Browser                    NextAuth                    Database
  │                          │                           │
  │  POST /api/auth/         │                           │
  │  callback/credentials    │                           │
  │  {email, password}       │                           │
  │─────────────────────────►│                           │
  │                          ├── db.query.users.         │
  │                          │   findFirst({email})       │
  │                          │───────────────────────────►│
  │                          │◄────── user record ───────│
  │                          │                           │
  │                          ├── bcrypt.compare(password, │
  │                          │   hashToCompare)           │
  │                          │                           │
  │                          ├── IF valid:               │
  │                          │   Update lastLogin        │
  │                          │   Generate JWT with       │
  │                          │   id, role, canViewAll, iat│
  │                          │                           │
  │◄─ Set-Cookie: session ──│                           │
  │◄─── Redirect to / ──────│                           │
```

Note: No account lockout — brute force protection is handled by Caddy rate limiting (5 requests/15 min per IP on auth endpoints). No dummy hash comparison — the rate limiter prevents timing attacks at the network level.

### 3.5 Session Invalidation Flow

```
Password change:
  PUT /api/profile (type=password)
    └── UPDATE users SET password_changed_at = UNIX_TIMESTAMP()
    └── All JWTs with iat < password_changed_at are rejected

Admin revokes sessions for user:
  POST /api/admin/users/[id]/reset-password
    └── Sets new password AND updates password_changed_at
    └── All existing JWTs for that user become invalid

Token check (on every authenticated request via withAuth):
  if (session.user.passwordChangedAt > 0 && 
      session.user.iat < session.user.passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }
```

---

## 4. Security Design

### 4.1 CSRF Protection (Simplified)

```
┌──────────────────────────────────────────────────────────────┐
│  For every POST/PUT/DELETE/PATCH request:                    │
│                                                              │
│  1. Read Origin header; fall back to Referer if Origin       │
│     is absent.                                               │
│  2. Extract hostname from Origin/Referer.                     │
│  3. Compare against the request's Host header (or configured  │
│     AUTH_URL).                                               │
│  4. If mismatch or absent → 403 INVALID_ORIGIN.              │
│                                                              │
│  Exempt: /api/auth/* (no session yet at login)               │
│  Exempt: /api/setup (POST, during initial setup)             │
│  Exempt: GET, HEAD, OPTIONS methods                          │
│                                                              │
│  Additionally:                                                │
│  - Session cookies use SameSite=Strict                       │
│  - Content-Security-Policy includes form-action 'self'       │
└──────────────────────────────────────────────────────────────┘
```

This is simpler and more maintainable than the double-submit cookie pattern because:
- No CSRF token endpoint to maintain
- No React context provider for CSRF tokens
- No per-request token fetching and header injection on the client
- No timing-safe comparison implementation
- Same security guarantees for a same-origin application

### 4.2 Session Invalidation Design

```
Login ──► JWT created with iat (issued-at timestamp)

Every authenticated request:
  withAuth() ──► session.user.iat
  if (session.user.passwordChangedAt > 0 && 
      session.user.iat < session.user.passwordChangedAt)
    └── Throw 401 Unauthorized

Password change:
  └── UPDATE users SET password_changed_at = <current_timestamp>

Admin "revoke sessions":
  └── Reset user's password (which updates password_changed_at)
  └── All existing JWTs become invalid

No separate table needed. No cleanup required. No per-request DB query.
```

### 4.3 Photo Security Design

```
Upload Flow:
  POST /api/inventory/[id]/photo
    ├── Auth: Verify item belongs to user
    ├── Validate: type (JPEG/PNG/GIF/WebP), size (≤5MB), extension
    ├── Sanitize: Remove null bytes, path traversal from filename
    ├── Store: UUID filename at UPLOADS_PATH/items/{itemId}/{uuid}.{ext}
    └── Record: INSERT INTO photos (itemId, filename, path, isPrimary)

Serve Flow:
  GET /api/photos/{itemId}/{filename}
    ├── Auth: Verify item belongs to user (or admin/canViewAll)
    ├── Read file from UPLOADS_PATH/items/{itemId}/{filename}
    └── Return with Content-Type + Cache-Control: private, max-age=3600

Note: Photos are NOT in public/ — served only via authenticated API.
```

---

## 5. Financial Calculation Design

### 5.1 Single Source of Truth

The profit formula exists **only in TypeScript** (`src/lib/financial.ts`). The reports endpoint uses this function to compute aggregates from raw sale data. There is no duplicate SQL formula.

```typescript
profit = (soldPrice + (shippingCollected || 0))
        - (salesTax || 0)
        - (platformFees || 0)
        - (refundAmount || 0)
        - purchasePrice
        - (shippingCost || 0);
```

This eliminates the risk of TypeScript/SQL formula drift and removes the need for a profit consistency test.

### 5.2 Reports Endpoint Implementation

```typescript
// GET /api/reports
export async function GET(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    // Fetch raw sales data
    const sales = await fetchSalesForUser(session, filters);
    
    // Compute aggregates using the single TypeScript function
    const totalProfit = sales.reduce((sum, sale) => 
      sum + calculateProfit(sale), 0);
    
    // Return computed results
    return NextResponse.json({ profit: { totalProfit }, ... });
  });
}
```

---

## 6. Status Machine Design

### 6.1 Item Status State Diagram

```
                    ┌───────────┐
         ┌─────────►│  available │◄──────────┐
         │          └─────┬─────┘            │
         │                │                  │
         │      ┌─────────┼─────────┐        │
         │      ▼         ▼         │        │
         │  ┌────────┐ ┌───────┐   │        │
         │  │ listed  │ │ sold  │   │        │
         │  └────┬───┘ └───┬───┘   │        │
         │       │         │       │        │
         │       │         │  ┌────▼────┐   │
         │       │         │  │returned │───┘
         │  ┌────▼───┐     │  └─────────┘
         │  │donated │     │
         │  └────────┘     │
         │            ┌────▼──────┐
         │            │ discarded │
         │            └───────────┘
         │
         └── (listed → available is also valid)
```

### 6.2 Status Transition Rules (in `constants.ts`)

```typescript
const ALLOWED_TRANSITIONS = {
  available: ['listed', 'sold', 'donated', 'discarded'],
  listed:    ['available', 'sold', 'donated', 'discarded'],
  sold:      ['returned'],
  returned:  ['available'],
  donated:   [],    // terminal
  discarded: [],    // terminal
};
```

### 6.3 Side Effects on Status Transitions

| Transition | Side Effect |
|-----------|------------|
| Any → `sold` | Item `removalDate` set to `soldDate` |
| Any → `donated` | `removalDate` set to current timestamp |
| Any → `discarded` | `removalDate` set to current timestamp |
| `returned` → `available` | `removalDate` cleared |
| Delete sale | Item status reverted to `available` (if `sold` or `returned`) |
| `refund_with_return` on sale | Item status → `returned`, `removalDate` cleared |

**Note:** Unlike v1, transitioning to `donated` or `discarded` does **NOT** auto-create a $0 sale record. These are inventory dispositions tracked via `removalDate`, not sales.

---

## 7. RBAC Design

### 7.1 Simplified Role System

Two roles with one permission toggle:

| Role | Description |
|------|-------------|
| `admin` | Full system access: user management, all data, settings, backup/restore |
| `user` | Standard user. If `canViewAll=true`, can view all data across users |

The `canViewAll` boolean column on the `users` table replaces the `power_user` role. This simplifies:
- Auth checks: `role === 'admin' || canViewAll === true` instead of three-way role checks
- UI: no separate role label/description for power_user
- Database: one fewer enum value, one boolean column instead of a role value
- Migration: no role migration needed — just add the column

### 7.2 Authorization Helper Functions

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

## 8. CSV Import Design

(Unchanged from v1 — fuzzy matching, batch inserts, transaction integrity.)

### 8.1 Column Mapping Strategy

```typescript
inventoryColumnMappings = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price'],
  // ... etc
};
```

### 8.2 Sales Import Resolution Flow

```
For each CSV row:
  1. Try itemId lookup (if provided and numeric)
  2. Try itemName exact match against user's items
  3. Try fuzzy match (name contains + purchaseDate within 1 day + purchasePrice within $1)
  4. If no match, create new item (with status = 'sold' or 'donated')
  5. If existing sale for item, update instead of inserting
  
All operations in single transaction for atomicity.
```

---

## 9. UI Design

### 9.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  Header                                                │
│  [Company Name] [Inventory] [Sales] [Mileage] [...]   │
│  [Import] [Reports] [Profile] [Admin*]    [Sign Out]   │
├──────────────────────────────────────────────────────┤
│                                                        │
│  Page Content (varies by route)                        │
│                                                        │
│  - Dashboard: Stats cards + quick actions              │
│  - Inventory: Filterable/sortable table + CRUD          │
│  - Sales: Filterable/sortable table + CRUD              │
│  - Mileage: Table + date range filter                  │
│  - Reports: Stats cards + charts                       │
│  - Import: Upload CSV with column mapping preview      │
│  - Admin/Users: User table + CRUD modals               │
│  - Admin/Settings: Company name, tagline, tax rate     │
│                                                        │
├──────────────────────────────────────────────────────┤
│  (Footer: none)                                        │
└──────────────────────────────────────────────────────┘
```

### 9.2 Data Pages as Server Components

Where possible, data display pages (inventory list, sales list, reports, etc.) use **Server Components** that query the database directly. This eliminates client-side `useEffect` + `fetch` patterns and provides faster initial loads. Only interactive elements (forms, modals, filters) are client components.

### 9.3 Key UI Components

| Component | Purpose |
|-----------|---------|
| `Header` | Navigation bar with role-based links, company name from settings |
| `ConfirmModal` | Reusable confirmation dialog |
| `SalesEntryModal` | Create/edit sale with item lookup, tax calculation |
| `RefundEntryModal` | Process refunds with type selection |
| `SaleFormFields` | Reusable sale form fields (price, platform, fees) |
| `UserModals` | Admin user create/edit/delete/reset-password modals |
| `SessionProvider` | NextAuth session provider wrapper |

### 9.4 Client-Side State Management

- **No global state store** (no Redux/Zustand).
- `SessionProvider` wraps the app for auth state.
- `useSaleForm` hook manages sale form state including auto-tax calculation.
- Data fetching in Server Components (no client-side `fetch` for reads).
- Form state managed locally with `useState` in client components.
- Mutations from client components use `fetch()` with `Origin` header (automatically sent by browsers).

---

## 10. Backup/Restore Design

### 10.1 Backup Format

```json
{
  "version": 2,
  "exportedAt": "2026-06-12T10:30:00.000Z",
  "tables": {
    "users": [...],
    "items": [...],
    "sales": [...],
    "photos": [...],
    "mileage": [...],
    "app_config": [...]
  }
}
```

Note: No `sessions`, `accounts`, `verification_tokens`, or `revoked_tokens` tables in backup (these tables don't exist in v2).

### 10.2 Restore Process

1. **Validate**: Every row in every table validated against Zod schemas.
2. **If validation fails**: Return 400 with all validation errors — no database changes.
3. **If validation passes**: Begin transaction.
4. **Clear tables** in dependency order: photos → sales → mileage → items → users → app_config.
5. **Insert rows** in dependency order: app_config → users → items → mileage → sales → photos.
6. **Commit transaction** (or rollback on error).

---

## 11. Error Handling Design

### 11.1 API Error Handling Pattern

```typescript
// All API routes use the withAuth wrapper:
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    // 1. Validate Origin/Referer for mutations
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    
    // 2. Zod validation
    const validation = createItemSchema.safeParse(body);
    if (!validation.success) { ... }
    
    // 3. Business logic
    const item = await db.insert(items).values({...});
    
    // 4. Return success
    return NextResponse.json(item, { status: 201 });
  });
}
```

### 11.2 Error Response Format

```json
// Validation error
{ "error": "Validation failed", "details": ["Name is required", "Price must be positive"] }

// Auth error
{ "error": "Unauthorized", "code": "UNAUTHORIZED" }

// RBAC error
{ "error": "Forbidden", "code": "FORBIDDEN" }

// Origin/Referer error
{ "error": "Invalid or missing Origin header", "code": "INVALID_ORIGIN" }
```

---

## 12. Configuration Design

### 12.1 Centralized Configuration (`config.ts`)

```typescript
config = {
  database: { path: '/data/sqlite.db' (prod) | env.DATABASE_PATH | 'sqlite.db' },
  uploads:  { path: '/data/uploads' (prod) | env.UPLOADS_PATH | 'uploads' },
  backups:  { path: '/data/backups' (prod) | env.BACKUPS_PATH | 'backups' },
  auth:     { sessionMaxAge: 30 * 24 * 60 * 60 },  // 30 days
}
```

Note: Removed `rateLimit.trustedProxies` — rate limiting is handled by Caddy.

---

## 13. Database Connection Design

### 13.1 Lazy Initialization (Proxy Pattern)

```typescript
// db.ts — unchanged from v1
let _db = null;

function getDb() {
  if (_db) return _db;
  const dbPath = getDbPath();
  if (dbPath.startsWith('/data/')) {
    mkdirSync('/data', { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = 32000');
  sqlite.pragma('temp_store = MEMORY');
  _db = drizzle(sqlite, { schema });
  return _db;
}

const db = new Proxy({} as DrizzleInstance, {
  get(_target, prop) {
    const actualDb = getDb();
    return actualDb[prop];
  },
});
```

---

## 14. Migration Design

### 14.1 Migration System

- **Tool**: Drizzle Kit generates migration files from `schema.ts` changes.
- **Storage**: Migrations stored as `drizzle/0000_name.sql`, etc.
- **Runtime**: `src/lib/migrate.ts` runs migrations at startup.
- **Idempotency**: Each migration checked by tag name AND content hash.

The migration from v1 to v2 schema requires:
1. Add `can_view_all` column to `users` (INTEGER DEFAULT 0)
2. Add `password_changed_at` column to `users` (INTEGER DEFAULT 0)
3. Migrate `power_user` role to `user` with `can_view_all = 1`
4. Remove `failed_login_attempts` and `locked_until` columns from `users`
5. Drop `revoked_tokens` table
6. Drop `sessions` table
7. Drop `accounts` table
8. Drop `verification_tokens` table
9. Create `app_config` table from `settings` key-value data
10. Drop `settings` table