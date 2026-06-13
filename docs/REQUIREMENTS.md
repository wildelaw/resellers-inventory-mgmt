# Resell Inventory Manager — Requirements Specification

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified requirements for the Resell Inventory Manager application.

---

## 1. Overview

Resell Inventory Manager is a self-hosted, single-tenant web application for resellers to track inventory purchases, sales, profitability, and mileage. It provides role-based access control, CSV import/export, backup/restore, and financial reporting.

---

## 2. User Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full system access: user management, all data, settings, backup/restore |
| `user` (with `canViewAll=true`) | View all data across users; create/edit only own inventory, sales, mileage |
| `user` (default) | View and manage only own data |

The `canViewAll` boolean on the `users` table replaces a separate `power_user` role. This simplifies RBAC to two roles with one permission toggle.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

#### AUTH-01: Credentials-based Authentication
- Users sign in with email + password via NextAuth v5 (Credentials provider).
- Passwords hashed with bcrypt (cost factor 10).
- JWT-based sessions (not database sessions), max age 30 days.
- Each JWT contains `id`, `role`, `canViewAll`, and `iat` (issued-at timestamp).

#### AUTH-02: Session Invalidation
- When a user's password is changed, `passwordChangedAt` is updated on the `users` row.
- On every authenticated request, the JWT's `iat` is compared against `user.passwordChangedAt`. If `iat < passwordChangedAt`, the session is rejected.
- Admins can invalidate all sessions for a user by updating that user's `passwordChangedAt`.
- No separate `revoked_tokens` table is needed.

#### AUTH-03: Setup Lock
- On first launch, if no users exist, the `/setup` page is accessible.
- Creating the first admin permanently locks the setup endpoint via an `app_config` row.
- Admin can re-open setup via `POST /api/admin/setup-unlock` (requires admin auth).

#### AUTH-04: CSRF Protection
- All state-changing HTTP methods (POST, PUT, DELETE, PATCH) verify the `Origin` or `Referer` header matches the request's host.
- Session cookies are set with `SameSite=Strict` to prevent cross-site request submission.
- Auth routes (`/api/auth/*`) are exempt from Origin/Referer checks since no session exists yet.

#### AUTH-05: Rate Limiting
- Rate limiting is handled at the Caddy reverse proxy layer (see OPERATIONS.md).
- No in-application rate limiter is needed.

### 3.2 Inventory Management

#### INV-01: Item Data Model
Each inventory item has:
- `id` (auto-increment PK)
- `name` (required, max 200 chars)
- `description` (optional, max 2000 chars)
- `purchaseDate` (required, timestamp)
- `purchasePrice` (required, positive real)
- `purchaseLocation` (optional, max 200 chars)
- `category` (optional, max 100 chars)
- `status` (enum: `available | listed | sold | returned | donated | discarded`, default `available`)
- `notes` (optional, max 2000 chars)
- `removalDate` (optional, timestamp — set when item leaves inventory)
- `metadata` (optional, JSON)
- `ownerId` (FK to users, required)
- `createdAt`, `updatedAt` (timestamps)

#### INV-02: Status Transitions
| From | To |
|------|-----|
| available | listed, sold, donated, discarded |
| listed | available, sold, donated, discarded |
| sold | returned |
| returned | available |
| donated | *(terminal)* |
| discarded | *(terminal)* |

When status changes to `donated` or `discarded`, `removalDate` is set to the current timestamp. When status changes from `returned` to `available`, `removalDate` is cleared. **No automatic $0 sale records are created** for donated/discarded items — these are inventory dispositions, not sales.

#### INV-03: Item CRUD
- **List** (`GET /api/inventory`): Paginated, filterable by status/category/search/date range, sortable.
- **Get** (`GET /api/inventory/[id]`): Single item with photos, sales, and owner.
- **Create** (`POST /api/inventory`): New item, defaults to `available` status.
- **Update** (`PUT /api/inventory/[id]`): Partial update with status transition validation.
- **Delete** (`DELETE /api/inventory/[id]`): Hard delete with cascading photos/sales.
- **RBAC**: Standard users see/edit only their own items; `canViewAll` users can see all; admin can see and edit all.

#### INV-04: Bulk Operations
- **PATCH** `/api/inventory/bulk`: Change status for multiple items (validates transitions, sets/clears `removalDate`).
- **DELETE** `/api/inventory/bulk`: Delete multiple items (owner-only).

#### INV-05: Photo Management
- Upload photos to items via `POST /api/inventory/[id]/photo` (multipart form data).
- Allowed types: JPEG, PNG, GIF, WebP; max 5MB per file.
- Photos stored at `UPLOADS_PATH/items/{itemId}/{uuid}.{ext}`, served via authenticated API route.
- First photo auto-set as primary; explicit primary setting supported.
- Delete photos via `DELETE /api/inventory/[id]/photo?photoId={id}`.

### 3.3 Sales & Refunds

#### SALE-01: Sale Data Model
Each sale has:
- `id`, `itemId` (nullable FK to items), `soldDate`, `soldPrice`, `shippingCost`, `shippingCollected`, `platform` (enum: `local|facebook|instagram|ebay|poshmark|mercari|consignment|other`), `salesTax`, `platformFees`, `refundAmount`, `refundReason`, `refundType` (`none|refund_no_return|refund_with_return`), `soldBy` (FK to users), `createdAt`.

#### SALE-02: Sale CRUD
- **List** (`GET /api/sales`): Paginated, filterable by date/platform/search, sortable.
- **Get** (`GET /api/sales/[id]`): Single sale with item and seller info.
- **Create** (`POST /api/sales`): Creates sale and auto-updates linked item status to `sold` (transactional).
- **Update** (`PUT /api/sales/[id]`): Update sale fields.
- **Delete** (`DELETE /api/sales/[id]`): Delete sale and revert item status to `available` (transactional).

#### SALE-03: Refund Processing
- `PATCH /api/sales` (with `saleId` in body): Process refund.
- `refund_with_return`: Sets item status to `returned` and clears `removalDate`.
- `refund_no_return`: Item stays `sold`; refund amount and reason recorded.
- Transactional — sale update and item status change happen atomically.

#### SALE-04: Profit Calculation
**Single source of truth** — profit is computed only in TypeScript (`src/lib/financial.ts`):
```
profit = soldPrice + shippingCollected - salesTax - platformFees - refundAmount - purchasePrice - shippingCost
```
The reports endpoint fetches raw sale data and computes aggregates using this function. There is no duplicate SQL formula.

### 3.4 Mileage Tracking

#### MILE-01: Mileage CRUD
- **List** (`GET /api/mileage`): Paginated, filterable by date range.
- **Create** (`POST /api/mileage`): New mileage entry.
- **Update** (`PUT /api/mileage/[id]`): Partial update.
- **Delete** (`DELETE /api/mileage/[id]`): Delete entry.

#### MILE-02: Mileage Reports
- `GET /api/mileage/reports`: Aggregates total miles, trips, averages, by-month and by-vehicle breakdowns.

#### MILE-03: Mileage Export
- `GET /api/mileage/export`: CSV download with date range filtering.

### 3.5 Reporting

#### RPT-01: Dashboard Reports
- `GET /api/reports`: Returns inventory stats, sales stats, profit (computed via `calculateProfit()`), sales by platform, and monthly trends.
- All queries respect RBAC (standard user sees own data only; `canViewAll` users and admins see all).
- Supports date range filtering.

### 3.6 CSV Import

#### IMP-01: Import Endpoint
- `POST /api/import`: Accepts `{ type, csvData, columnMappings? }` where type is `inventory`, `sales`, or `mileage`.
- CSV data limited to 1MB and 32,000 rows.
- Fuzzy column mapping for header names.

#### IMP-02: Inventory Import
- Required field: `name`. Auto-parse purchasePrice, estimate dates.

#### IMP-03: Sales Import
- Supports item lookup by ID or name (exact, then fuzzy match).
- Creates new items if no match found. Item status auto-updated.
- All operations in single transaction.

#### IMP-04: Mileage Import
- Required fields: `date`, `miles`. Batch inserts in chunks of 100.

### 3.7 User Management (Admin Only)

#### USR-01: User CRUD
- **List** (`GET /api/admin/users`): Paginated, filterable by role/active/search.
- **Create** (`POST /api/admin/users`): New user with role and `canViewAll` flag.
- **Get** (`GET /api/admin/users/[id]`): User details + stats.
- **Update** (`PUT /api/admin/users/[id]`): Update email, name, role, `canViewAll`, `isActive`.
- **Delete** (`DELETE /api/admin/users/[id]`): With optional `transferDataTo` param.
- Admin cannot deactivate or change role of their own account.

#### USR-02: Password Requirements
- Minimum 8 characters, maximum 128 characters.
- Must include: uppercase, lowercase, digit, special character.

#### USR-03: Password Reset
- `POST /api/admin/users/[id]/reset-password`: Admin resets any user's password (also invalidates sessions via `passwordChangedAt`).
- `PUT /api/profile` (type=password): User changes own password (must provide current password).

### 3.8 Settings

#### SET-01: Application Settings
- `GET /api/settings`: Returns all settings.
- `PUT /api/settings`: Admin-only. Supports `company_name`, `company_tagline`, `sales_tax_rate` (0–1 range).
- Settings stored in a single-row `app_config` table with typed columns (not key-value).

### 3.9 Backup & Restore

#### BAK-01: Backup
- `GET /api/admin/backup`: Admin-only. Exports all tables as JSON with version and timestamp.

#### BAK-02: Restore
- `POST /api/admin/restore`: Admin-only. Validates all rows against Zod schemas, then restores within a transaction.
- All-or-nothing: if any validation fails, no database changes occur.

### 3.10 Setup Flow

#### SETUP-01: Initial Setup
- `GET /api/setup`: Returns `{ needsSetup, hasUsers }`.
- `POST /api/setup`: Creates admin user if no users exist and setup is not locked.
- Runs database migrations before creating the user.
- Locks setup after first admin creation via `app_config.setupComplete`.

### 3.11 Profile Management

#### PROF-01: Profile API
- `GET /api/profile`: Returns current user's profile.
- `PUT /api/profile`: Update name or change password.

### 3.12 Health Check

#### HEALTH-01: Health Endpoint
- `GET /api/health`: Returns `{ status: 'ok', timestamp }` — no auth required.

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement |
|-----|------------|
| SEC-01 | CSRF protection via `SameSite=Strict` cookies + Origin/Referer header verification on state-changing requests |
| SEC-02 | Password hashing with bcrypt (cost factor 10) |
| SEC-03 | JWT sessions with `iat` claim checked against `passwordChangedAt` for invalidation |
| SEC-04 | Rate limiting at the Caddy reverse proxy layer |
| SEC-05 | Content Security Policy headers |
| SEC-06 | Photos served via authenticated API route (not public directory) |
| SEC-07 | File upload validation: type, size (5MB), filename sanitization |
| SEC-08 | SQL injection protection via Drizzle ORM parameterized queries |
| SEC-09 | Setup lock prevents re-creation of admin accounts |
| SEC-10 | Backup restore validates all rows with Zod schemas before database changes |
| SEC-11 | Admin cannot deactivate or role-change their own account |

### 4.2 Performance

| ID | Requirement |
|-----|------------|
| PER-01 | SQLite WAL mode for concurrent read/write performance |
| PER-02 | PRAGMA `synchronous=NORMAL`, `cache_size=32000`, `temp_store=MEMORY` |
| PER-03 | Lazy database initialization via Proxy pattern (allows build without DB) |
| PER-04 | Paginated API responses (default 20, max 100 per page) |
| PER-05 | Profit computation in TypeScript (single source of truth) |
| PER-06 | CSV import batch processing (100 rows per insert) |

### 4.3 Reliability

| ID | Requirement |
|-----|------------|
| REL-01 | All multi-table mutations use database transactions |
| REL-02 | Backup restore runs inside transaction — all-or-nothing |
| REL-03 | Database migrations run automatically on container startup |

### 4.4 Deployment

| ID | Requirement |
|-----|------------|
| DEP-01 | Docker deployment with Caddy reverse proxy (HTTPS termination + rate limiting) |
| DEP-02 | Production paths: `/data/sqlite.db`, `/data/uploads`, `/data/backups` |
| DEP-03 | Read-only container filesystem (except `/data` and `/tmp` tmpfs) |
| DEP-04 | Health check on `/api/health` |
| DEP-05 | Multi-stage Docker build |