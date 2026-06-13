# Resell Inventory Manager — Threat Model

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Systematic identification and analysis of security threats against the Resell Inventory Manager application, with mitigations mapped to the v2 architecture.

---

## 1. System Description

### 1.1 Scope

Resell Inventory Manager is a self-hosted, single-tenant web application for resellers to track inventory, sales, profitability, and mileage. It runs as a single Docker container behind a Caddy reverse proxy, using a local SQLite database.

### 1.2 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / LAN                           │
│                    (Untrusted Network)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (443/8443)
                    ┌──────▼──────┐
                    │    Caddy     │  ← Trust Boundary 1: Network Edge
                    │  (container) │     TLS termination, rate limiting,
                    └──────┬──────┘     security headers
                           │ HTTP (internal Docker network)
                    ┌──────▼──────┐
                    │  Next.js App │  ← Trust Boundary 2: Application
                    │  (container) │     Auth, RBAC, input validation,
                    └──────┬──────┘     Origin/Referer CSRF
                           │
               ┌───────────┼───────────┐
               │           │           │
         ┌─────▼─────┐ ┌──▼───┐ ┌───▼────┐
         │  SQLite   │ │Photos│ │ Backups│  ← Trust Boundary 3: Data Store
         │ /data/    │ │/data/│ │ /data/  │     File system, database
         └───────────┘ └──────┘ └─────────┘
```

### 1.3 Data Classification

| Data Type | Sensitivity | Storage | Examples |
|-----------|-------------|---------|----------|
| Authentication Secrets | **Critical** | DB: `users.password_hash` | bcrypt hashes |
| Session Tokens | **Critical** | Browser cookie (JWT) | NextAuth session tokens |
| Business Financial | **High** | DB: `items`, `sales` | Purchase prices, sale amounts, profit data |
| Personally Identifiable | **High** | DB: `users.email`, `users.name` | User emails, names |
| Business Operational | **Medium** | DB: `mileage`, `photos` | Trip logs, item photos |
| Application Config | **Low** | DB: `app_config` | Company name, tax rate |
| Auth Secret | **Critical** | Env: `AUTH_SECRET` | JWT signing key |

### 1.4 Actors

| Actor | Description | Trust Level |
|-------|-------------|-------------|
| Anonymous User | Unauthenticated visitor | Untrusted |
| Standard User | Authenticated `user` (canViewAll=false) | Partially trusted |
| Viewer User | Authenticated `user` (canViewAll=true) | Partially trusted |
| Admin | Authenticated `admin` | Fully trusted |
| Caddy | Reverse proxy container | Trusted (network segment) |
| Application | Next.js server process | Trusted (self) |
| Attacker | Malicious actor on the network | Untrusted |

---

## 2. Threat Identification

Threats are categorized using STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).

### 2.1 Spoofing — Identity Forgery

#### S-01: Credential Brute Force
| | |
|---|---|
| **Threat** | Attacker guesses user passwords by trying many combinations against the login endpoint. |
| **Attack Vector** | Repeated POST requests to `/api/auth/callback/credentials` with different passwords. |
| **Impact** | Account takeover, data theft, privilege escalation. |
| **Likelihood** | Medium — passwords with minimum requirements are still guessable. |
| **Mitigation** | ✅ Caddy rate limiting: 5 auth requests per IP per 15-minute window. ✅ bcrypt with cost factor 10 (slows each attempt to ~100ms). ✅ `SameSite=Strict` cookies prevent cross-origin submission. |
| **Residual Risk** | An attacker with multiple IP addresses or patient timing could still attempt brute force. Consider adding account lockout for high-value admin accounts in a future version. |

#### S-02: Session Token Theft
| | |
|---|---|
| **Threat** | Attacker steals a JWT session cookie via XSS, network sniffing, or browser vulnerability. |
| **Attack Vector** | XSS injection to read `document.cookie`, or MITM on HTTP connections. |
| **Impact** | Full session hijacking, access to all data the user can see. |
| **Likelihood** | Low — CSP headers restrict script sources; HTTPS enforced. |
| **Mitigation** | ✅ Content Security Policy prevents XSS script injection. ✅ Caddy enforces HTTPS, redirecting all HTTP to HTTPS. ✅ `SameSite=Strict` prevents cookie submission from cross-site requests. ✅ No `HttpOnly` flag removed from session cookie (NextAuth sets it by default). |
| **Residual Risk** | If an XSS vulnerability is introduced in template code, the session cookie could be stolen. Regular security reviews of template output are recommended. |

#### S-03: JWT Tampering or Forgery
| | |
|---|---|
| **Threat** | Attacker modifies or forges a JWT to change user ID, role, or other claims. |
| **Attack Vector** | Modifying the JWT payload and recalculating the signature without knowing `AUTH_SECRET`. |
| **Impact** | Identity spoofing, privilege escalation. |
| **Likelihood** | Very Low — requires knowing or cracking `AUTH_SECRET`. |
| **Mitigation** | ✅ JWTs are signed with `AUTH_SECRET` (minimum 32 characters, generated via `openssl rand -base64 32`). ✅ NextAuth v5 validates the signature on every request. ✅ `AUTH_SECRET` is stored as an environment variable, not in source code. |
| **Residual Risk** | If `AUTH_SECRET` is leaked (e.g., committed to git), all tokens can be forged. Ensure `.env.local` is gitignored. |

#### S-04: First-User Setup Hijacking
| | |
|---|---|
| **Threat** | Attacker creates an admin account before the legitimate owner during initial setup. |
| **Attack Vector** | Accessing `/setup` before the legitimate owner when the application is first deployed. |
| **Impact** | Full system compromise. |
| **Likelihood** | Medium — if the application is exposed to the internet before initial setup. |
| **Mitigation** | ✅ Setup is only available when `app_config.setup_complete = 0` AND no users exist. ✅ After setup, the endpoint is permanently locked. ✅ Caddy rate limiting makes rapid attempts difficult. |
| **Residual Risk** | If the application is deployed and exposed before the owner sets it up, an attacker could create an admin account. **Mitigation:** Deploy with the setup page behind a firewall, or create the admin via `seed.ts` before exposing the application. |

---

### 2.2 Tampering — Unauthorized Modification

#### T-01: Cross-Site Request Forgery (CSRF)
| | |
|---|---|
| **Threat** | Attacker tricks an authenticated user into making state-changing requests (creating items, deleting sales, etc.) without their knowledge. |
| **Attack Vector** | Malicious website or email containing a form or JavaScript that submits to the application. |
| **Impact** | Unauthorized data creation, modification, or deletion. |
| **Likelihood** | Low. |
| **Mitigation** | ✅ `SameSite=Strict` on session cookies prevents the browser from sending the cookie in cross-site requests. ✅ `Origin`/`Referer` header validation on all POST/PUT/DELETE/PATCH requests rejects requests from different origins. ✅ CSP `form-action 'self'` prevents forms from submitting to other origins. |
| **Residual Risk** | `SameSite=Strict` does not protect against same-origin CSRF (e.g., if an XSS vulnerability exists on the same origin). The Origin/Referer check does protect against this because the attacker would need to control the same origin, which would already mean full compromise. **Note:** Older browsers that don't support `SameSite` are vulnerable, but modern browsers (2020+) all support it. |

#### T-02: SQL Injection
| | |
|---|---|
| **Threat** | Attacker injects SQL commands through input fields to read, modify, or delete database data. |
| **Attack Vector** | Input fields that are concatenated into SQL queries without parameterization. |
| **Impact** | Full database compromise. |
| **Likelihood** | Very Low. |
| **Mitigation** | ✅ All database queries use Drizzle ORM, which generates parameterized queries. ✅ Search inputs use `escapeLike()` to escape `%` and `_` wildcards. ✅ Zod validation constrains all input types and lengths before database interaction. |
| **Residual Risk** | Minimal. Drizzle ORM's parameterized queries make SQL injection virtually impossible. The `escapeLike()` function prevents wildcard abuse in LIKE queries. |

#### T-03: Mass Assignment / Input Validation Bypass
| | |
|---|---|
| **Threat** | Attacker includes unexpected fields in API requests to modify data they shouldn't (e.g., changing `role` to `admin` or `ownerId` to another user's ID). |
| **Attack Vector** | Sending `{ "name": "Item", "ownerId": 999, "role": "admin" }` to item creation endpoint. |
| **Impact** | Privilege escalation, data ownership violations. |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ All API inputs are validated through Zod schemas that explicitly define allowed fields. ✅ `ownerId` is always set server-side from the authenticated session, never from user input. ✅ `role` and `canViewAll` changes are restricted to admin-only endpoints. |
| **Residual Risk** | If a developer adds a new field to the database schema and forgets to add it to the Zod validation schema, it could be set by the client. Code review should ensure all schema changes are reflected in validation schemas. |

#### T-04: Status Transition Violation
| | |
|---|---|
| **Threat** | Attacker directly updates an item's status to an invalid transition (e.g., `sold` → `available`, bypassing the `returned` intermediate state). |
| **Attack Vector** | Sending `PUT /api/inventory/123` with `{ "status": "available" }` for an item currently in `sold` status. |
| **Impact** | Data integrity violation — items could appear available when they're actually sold. |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ `isValidTransition()` validates all status changes against `ALLOWED_TRANSITIONS` before applying updates. ✅ Server-side validation only; client-side transitions are suggestions, not enforcement. |
| **Residual Risk** | If `isValidTransition()` is not called in a new API route, invalid transitions could be applied. All item update routes must call this function. |

#### T-05: Backup Tampering
| | |
|---|---|
| **Threat** | Attacker uploads a maliciously crafted backup file that contains modified data (e.g., changing their role to admin). |
| **Attack Vector** | `POST /api/admin/restore` or `PUT /api/setup` with modified backup JSON. |
| **Impact** | Full data replacement, potential privilege escalation. |
| **Likelihood** | Low — requires admin access or initial setup access. |
| **Mitigation** | ✅ All backup rows are validated against Zod schemas before any database changes. ✅ Role values are constrained to `admin` or `user`. ✅ Restore runs within a transaction — all-or-nothing. ✅ Setup restore is only available when `setup_complete = 0` and no users exist. |
| **Residual Risk** | A sophisticated attacker with admin credentials could craft a valid backup that changes their role. The Zod schemas validate types and enums, not business logic rules like "only one admin should exist." Consider adding a post-restore validation step that ensures at least one admin exists. |

#### T-06: Photo Path Traversal
| | |
|---|---|
| **Threat** | Attacker uploads a file with a path traversal filename (e.g., `../../etc/passwd`) to overwrite system files. |
| **Attack Vector** | File upload with manipulated filename in multipart form data. |
| **Impact** | Arbitrary file write, potential remote code execution. |
| **Likelihood** | Low. |
| **Mitigation** | ✅ Filenames are replaced with UUID v4 — the original filename is never used for storage. ✅ Null bytes are stripped from filenames. ✅ Upload path is constructed as `UPLOADS_PATH/items/{itemId}/{uuid}.{ext}` — no user input in the path. ✅ File type and size validation (JPEG/PNG/GIF/WebP, max 5MB). ✅ Container filesystem is read-only except `/data` and `/tmp`. |
| **Residual Risk** | Minimal. The UUID-based path construction and read-only container make path traversal extremely difficult. |

---

### 2.3 Repudiation — Action Denial

#### R-01: Lack of Audit Trail
| | |
|---|---|
| **Threat** | User denies performing an action (creating an item, deleting a sale, changing settings) and there is no evidence to prove otherwise. |
| **Attack Vector** | N/A — this is an absence of a security control. |
| **Impact** | Cannot determine who did what; cannot hold users accountable. |
| **Likelihood** | High — currently no audit logging exists. |
| **Mitigation** | ⚠️ Partial: `items.ownerId`, `sales.soldBy`, and `mileage.ownerId` track data ownership. `users.createdBy` tracks who created each user. `users.lastLogin` tracks the last login time. However, there is no audit log for updates, deletions, or admin actions. |
| **Residual Risk** | **Medium.** If accountability is important, add an `audit_log` table that records who did what, when, and to which resource. This is a recommended future enhancement. |

---

### 2.4 Information Disclosure — Data Exposure

#### D-01: Authorization Bypass (IDOR)
| | |
|---|---|
| **Threat** | User accesses another user's data by directly referencing their ID in the URL (e.g., `GET /api/inventory/42` where item 42 belongs to another user). |
| **Attack Vector** | Modifying URL parameters to access other users' items, sales, or mileage entries. |
| **Impact** | Unauthorized data viewing (financial records, item details, photos). |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ Every data access endpoint checks `ownerId` against the authenticated user's ID (or `role === 'admin'` or `canViewAll`). ✅ RBAC helpers (`canViewAllData`, `canEditOthersData`, `canAccessResource`) enforce ownership checks. ✅ Photo serving endpoint authenticates the user before serving files. |
| **Residual Risk** | If a developer forgets to add ownership checks in a new endpoint, IDOR vulnerabilities could exist. All new routes must include ownership verification. |

#### D-02: Sensitive Data in Responses
| | |
|---|---|
| **Threat** | API responses include sensitive data that should not be exposed (e.g., `password_hash` in user listings, other users' financial data). |
| **Attack Vector** | Legitimate API requests that return more data than intended. |
| **Impact** | Password hash exposure (if cracked), financial data exposure. |
| **Likelihood** | Low. |
| **Mitigation** | ✅ Password hashes are excluded from all API responses (`SELECT` never includes `password_hash`). ✅ User listings exclude `password_hash` and `passwordChangedAt`. ✅ RBAC filtering ensures users only see their own financial data (unless `canViewAll`). |
| **Residual Risk** | If a developer adds a new endpoint that returns full user objects without filtering, password hashes could be exposed. Code review must verify that all user data responses exclude `password_hash`. |

#### D-03: Photo Access Without Authentication
| | |
|---|---|
| **Threat** | Attacker accesses photos of other users' items by guessing or enumerating photo URLs. |
| **Attack Vector** | Direct requests to `/api/photos/{itemId}/{filename}` without authentication. |
| **Impact** | Exposure of item photos (which may show personal information, locations, etc.). |
| **Likelihood** | Low. |
| **Mitigation** | ✅ Photos are served via an authenticated API route (`GET /api/photos/{itemId}/{filename}`), not from the `public/` directory. ✅ The route verifies that the requesting user owns the item (or is admin/has canViewAll). ✅ Photo filenames are UUIDs, making enumeration difficult. |
| **Residual Risk** | If someone has a valid session and `canViewAll`, they can view any photo. This is by design — the `canViewAll` flag grants read access to all data. |

#### D-04: Error Information Leakage
| | |
|---|---|
| **Threat** | Error messages reveal internal implementation details (database errors, stack traces, file paths). |
| **Attack Vector** | Sending malformed input that triggers internal errors. |
| **Impact** | Information disclosure that aids further attacks. |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ `handleApiError()` returns generic "Internal server error" messages in production (`NODE_ENV=production`). ✅ Detailed error messages are only shown in development. ✅ Zod validation errors are specific but don't reveal internal structure. |
| **Residual Risk** | If an unhandled exception occurs in production, Next.js may show a default error page. Ensure `NODE_ENV=production` is always set in Docker deployments. |

#### D-05: Directory Listing / File Exposure
| | |
|---|---|
| **Threat** | Attacker accesses SQLite database file, backups, or uploaded photos directly via the web server. |
| **Attack Vector** | Requests to `/data/sqlite.db`, `/data/backups/`, or `/data/uploads/` via the web server. |
| **Impact** | Full database exposure, photo exposure, backup exposure. |
| **Likelihood** | Very Low. |
| **Mitigation** | ✅ The data directory (`/data/`) is outside the Next.js `public/` directory and is not served by the web server. ✅ Photos are served only via authenticated API routes. ✅ The container filesystem is read-only except `/data` and `/tmp`. ✅ Next.js standalone server does not serve files from `/data/`. |
| **Residual Risk** | None significant. The architecture ensures data files are never directly accessible via HTTP. |

#### D-06: JWT Claims Exposure
| | |
|---|---|
| **Threat** | JWT tokens contain user ID, role, `canViewAll` flag, and `iat` — all visible to anyone who can decode the token. |
| **Attack Vector** | Base64-decoding the JWT payload (no encryption, only signing). |
| **Impact** | Low — reveals user metadata but doesn't allow modification. |
| **Likelihood** | High — anyone with a token can decode it. |
| **Mitigation** | ✅ JWTs are signed (not encrypted) — this is standard practice. ✅ No highly sensitive data (passwords, secrets) is stored in the JWT. ✅ Token validity is checked via signature verification on every request. |
| **Residual Risk** | If sensitive data must be hidden, consider encrypting the JWT payload. For this application, the current claims (id, role, canViewAll, iat) are not sensitive. |

---

### 2.5 Denial of Service — Availability Disruption

#### DoS-01: Application-Level Rate Limiting Bypass
| | |
|---|---|
| **Threat** | Attacker overwhelms the application with requests, bypassing Caddy rate limits via distributed IPs or targeting unauthenticated endpoints. |
| **Attack Vector** | DDoS attack, or targeted flooding of `/api/health` (unauthenticated, no rate limit). |
| **Impact** | Application becomes slow or unresponsive for legitimate users. |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ Caddy rate limiting: 5 req/15min per IP for auth, 100 req/15min per IP for mutations. ✅ SQLite WAL mode supports concurrent readers. ✅ `/api/health` is a lightweight endpoint. |
| **Residual Risk** | Caddy rate limiting is per-IP, so distributed attacks from many IPs can still overwhelm the application. The `/api/health` endpoint has no rate limit but is extremely lightweight. **Mitigation:** For production, consider Cloudflare or similar CDN/DDoS protection in front of Caddy. |

#### DoS-02: Database Lock Contention (Write Starvation)
| | |
|---|---|
| **Threat** | SQLite only supports one concurrent writer. Under heavy write load, write transactions queue and the application appears to hang. |
| **Attack Vector** | Multiple concurrent write requests (creating items, uploading photos, importing CSV). |
| **Impact** | Write operations timeout or fail, application becomes unresponsive. |
| **Likelihood** | Low-Medium for a single-tenant app with few users. |
| **Mitigation** | ✅ WAL mode allows concurrent reads during writes. ✅ All multi-table mutations use transactions to minimize lock duration. ✅ CSV import uses batch inserts (100 rows at a time). ✅ Reports compute aggregates in TypeScript (no heavy SQL aggregates holding write locks). |
| **Residual Risk** | Under extreme write contention (e.g., CSV import of thousands of rows while multiple users are editing), transactions could timeout. For a single-tenant app with <10 concurrent users, this is unlikely. If scalability is needed, migrate to PostgreSQL. |

#### DoS-03: Disk Exhaustion via Photo Uploads
| | |
|---|---|
| **Threat** | Attacker fills disk space by uploading many large photos. |
| **Attack Vector** | Repeated uploads of photos at the 5MB size limit. |
| **Impact** | Application crashes when disk is full; SQLite cannot write; backups fail. |
| **Likelihood** | Low-Medium. |
| **Mitigation** | ✅ File size limit of 5MB per photo. ✅ File type validation (JPEG/PNG/GIF/WebP only). ✅ Container has `/tmp` limited to 100MB tmpfs. |
| **Residual Risk** | No per-user or global photo storage quota exists. An attacker with legitimate credentials could upload thousands of photos. **Recommended:** Add a configurable storage limit (e.g., total photos per user or per instance). |

#### DoS-04: Backup Restore Resource Exhaustion
| | |
|---|---|
| **Threat** | Admin restores a very large backup, consuming all memory or disk space. |
| **Attack Vector** | `POST /api/admin/restore` with a large JSON file. |
| **Impact** | Application OOM, disk full, or extended lock time. |
| **Likelihood** | Low — requires admin credentials. |
| **Mitigation** | ✅ Zod validation runs on all rows before any database changes. ✅ Restore runs within a single transaction. ✅ Caddy rate limiting limits request frequency. |
| **Residual Risk** | No file size limit on backup upload. **Recommended:** Add a request body size limit (e.g., 50MB) for the restore endpoint via Next.js `api.bodyParser.size` or Caddy configuration. |

---

### 2.6 Elevation of Privilege — Unauthorized Access Level

#### E-01: Role Manipulation
| | |
|---|---|
| **Threat** | A standard user escalates their privileges to admin by modifying their role. |
| **Attack Vector** | Sending `PUT /api/profile` with `{ "role": "admin" }` or `PUT /api/inventory/123` with `{ "ownerId": 999 }`. |
| **Impact** | Full system compromise. |
| **Likelihood** | Low. |
| **Mitigation** | ✅ Zod validation schemas explicitly define which fields are allowed in each endpoint. ✅ `role` and `canViewAll` are only settable via admin endpoints (`PUT /api/admin/users/[id]`). ✅ `ownerId` is always set server-side from the session, never from request input. ✅ Admin cannot demote themselves or deactivate their own account. |
| **Residual Risk** | If a developer adds a new field to a Zod schema without considering security implications, it could be exploitable. Code review must verify that all mutation schemas exclude `role`, `canViewAll`, `ownerId`, and `passwordChangedAt` from user-modifiable inputs. |

#### E-02: `canViewAll` Flag Abuse
| | |
|---|---|
| **Threat** | A user with `canViewAll=true` uses their read access to gain write access to others' data. |
| **Attack Vector** | Attempting to modify or delete another user's items, sales, or mileage entries despite `canViewAll` only granting read access. |
| **Impact** | Unauthorized data modification or deletion. |
| **Likelihood** | Medium. |
| **Mitigation** | ✅ `canEditOthersData()` returns `true` only for `role === 'admin'`. ✅ All write endpoints check both `canViewAllData()` (for reads) and `canEditOthersData()` or `role === 'admin'` (for writes) separately. ✅ Ownership checks (`item.ownerId === session.user.id`) are enforced on all mutation endpoints. |
| **Residual Risk** | If a developer creates a new write endpoint and only checks `canViewAllData()` instead of `canEditOthersData()`, the permission boundary could be crossed. All new write endpoints must explicitly check write permissions. |

#### E-03: Setup Re-opening After Lock
| | |
|---|---|
| **Threat** | Attacker re-opens the setup endpoint to create a new admin account. |
| **Attack Vector** | `POST /api/admin/setup-unlock` followed by `POST /api/setup` to create a new admin. |
| **Impact** | Additional admin account created, potentially with different credentials. |
| **Likelihood** | Low — requires existing admin credentials. |
| **Mitigation** | ✅ `POST /api/admin/setup-unlock` requires admin authentication and Origin/Referer validation. ✅ `POST /api/setup` only works when `setup_complete = 0` AND no users exist. ✅ After creating a new admin, `setup_complete` is immediately set back to `1`. |
| **Residual Risk** | If an attacker obtains admin credentials, they can re-open setup, but only if there are no users in the database (which is impossible during normal operation). The setup-unlock endpoint is primarily for disaster recovery scenarios. |

#### E-04: Password Reset Privilege Escalation
| | |
|---|---|
| **Threat** | Admin resets another admin's password to gain access to their account. |
| **Attack Vector** | `POST /api/admin/users/[id]/reset-password` targeting another admin's account. |
| **Impact** | Account takeover of another admin. |
| **Likelihood** | Low — requires admin credentials. |
| **Mitigation** | ✅ Admin password reset is an admin-only operation by design. ✅ Password resets update `passwordChangedAt`, which immediately invalidates the target's sessions. |
| **Residual Risk** | In a single-tenant app with typically 1-2 admins, this is an acceptable risk. If multiple admins exist and mutual distrust is a concern, add an audit log for admin actions (see R-01). |

---

## 3. Threat Summary Matrix

| ID | Threat | Category | Impact | Likelihood | Risk | Current Mitigation |
|----|--------|----------|--------|------------|------|---------------------|
| S-01 | Credential brute force | Spoofing | High | Medium | **Medium** | Caddy rate limit, bcrypt |
| S-02 | Session token theft | Spoofing | High | Low | Low | CSP, HTTPS, SameSite |
| S-03 | JWT forgery | Spoofing | Critical | Very Low | **Low** | AUTH_SECRET signing |
| S-04 | Setup hijacking | Spoofing | Critical | Medium | **Medium** | Setup lock, rate limit |
| T-01 | CSRF | Tampering | Medium | Low | Low | SameSite, Origin check |
| T-02 | SQL injection | Tampering | Critical | Very Low | Low | Drizzle ORM, Zod |
| T-03 | Mass assignment | Tampering | High | Medium | **Medium** | Zod schemas, server-side defaults |
| T-04 | Invalid status transition | Tampering | Medium | Medium | **Medium** | isValidTransition() |
| T-05 | Backup tampering | Tampering | Critical | Low | **Medium** | Zod validation, transactions |
| T-06 | Photo path traversal | Tampering | Critical | Low | Low | UUID filenames, read-only FS |
| R-01 | No audit trail | Repudiation | Medium | High | **Medium** | ⚠️ Partial (ownership tracking only) |
| D-01 | IDOR | Disclosure | High | Medium | **Medium** | RBAC, ownership checks |
| D-02 | Sensitive data in responses | Disclosure | High | Low | Low | Field filtering |
| D-03 | Photo access without auth | Disclosure | Medium | Low | Low | Authenticated photo route |
| D-04 | Error information leakage | Disclosure | Low | Medium | Low | Generic prod errors |
| D-05 | Directory listing | Disclosure | Critical | Very Low | Low | Data outside public/ |
| D-06 | JWT claims exposure | Disclosure | Low | High | Low | Standard JWT practice |
| DoS-01 | Rate limit bypass | DoS | Medium | Medium | **Medium** | Caddy rate limit |
| DoS-02 | SQLite write contention | DoS | Medium | Low | Low | WAL mode, transactions |
| DoS-03 | Disk exhaustion (photos) | DoS | High | Low-Medium | **Medium** | 5MB limit, type validation |
| DoS-04 | Backup restore exhaustion | DoS | Medium | Low | Low | Transaction, validation |
| E-01 | Role manipulation | Elevation | Critical | Low | Low | Zod schemas, server defaults |
| E-02 | canViewAll write abuse | Elevation | High | Medium | **Medium** | Separate read/write RBAC |
| E-03 | Setup re-opening | Elevation | Critical | Low | Low | Admin auth required |
| E-04 | Password reset escalation | Elevation | High | Low | Low | Admin-only, invalidates sessions |

---

## 4. Risk Prioritization

### 4.1 High Priority (Address Before Launch)

| Priority | Threat | Recommended Action |
|----------|--------|--------------------|
| **P1** | S-04: Setup hijacking | Deploy behind firewall initially; create admin via `seed.ts` before exposing |
| **P2** | T-03: Mass assignment | Audit all Zod schemas to ensure `role`, `canViewAll`, `ownerId`, `passwordChangedAt` are never in user-modifiable schemas |
| **P3** | T-05: Backup tampering | Add post-restore validation that at least one admin exists |
| **P4** | D-01: IDOR | Audit all data-access endpoints for ownership checks; add integration tests for each RBAC scenario |
| **P5** | E-02: canViewAll write abuse | Audit all write endpoints to verify `canEditOthersData()` is checked, not just `canViewAllData()` |

### 4.2 Medium Priority (Address Soon After Launch)

| Priority | Threat | Recommended Action |
|----------|--------|--------------------|
| **P6** | R-01: No audit trail | Add `audit_log` table recording who, what, when, and which resource for all mutations |
| **P7** | DoS-03: Disk exhaustion | Add per-user photo quota (e.g., 50 photos or 100MB per user) |
| **P8** | DoS-04: Backup restore exhaustion | Add request body size limit (e.g., 50MB) for restore endpoint |
| **P9** | S-01: Credential brute force | Consider adding optional account lockout for admin accounts only (5 failures → 15-min lock) |

### 4.3 Low Priority (Accept or Monitor)

| Priority | Threat | Recommended Action |
|----------|--------|--------------------|
| **P10** | S-02: Session token theft | Monitor for XSS vulnerabilities; review CSP compliance |
| **P11** | D-04: Error information leakage | Verify `NODE_ENV=production` in Docker; test error responses |
| **P12** | D-06: JWT claims exposure | Accept — no sensitive data in JWT; consider encryption only if needed |
| **P13** | DoS-01: Rate limit bypass | Consider Cloudflare or CDN for DDoS protection if the app grows |

---

## 5. Threat Scenarios

### 5.1 Scenario: Compromised User Account

**Attacker:** Obtains a standard user's credentials via phishing.

**Attack Path:**
1. Attacker logs in as the user via `/api/auth/callback/credentials`.
2. Attacker can view and modify the user's own items, sales, and mileage.
3. Attacker cannot view other users' data (unless `canViewAll=true`).
4. Attacker cannot access admin endpoints.

**Impact:** Limited to the compromised user's data.

**Mitigation in Place:** RBAC limits damage to the compromised user's data. `canViewAll` users can read all data but not modify others' data.

**Residual Risk:** If the compromised user has `canViewAll=true`, the attacker can read all users' financial data.

### 5.2 Scenario: Malicious Insider (canViewAll User)

**Attacker:** A legitimate user with `canViewAll=true` who wants to modify another user's data.

**Attack Path:**
1. Attacker attempts `PUT /api/inventory/42` to change another user's item.
2. Server checks `canEditOthersData()` → returns `false` for non-admin users.
3. Request is rejected with 403 Forbidden.

**Impact:** None — the write permission check blocks the attack.

**Verification:** This scenario should be covered in integration tests (`authorization.test.ts`).

### 5.3 Scenario: XSS Leading to Session Hijack

**Attacker:** Injects malicious JavaScript into an input field (e.g., item name, description).

**Attack Path:**
1. Attacker creates an item with `<script>fetch('/api/admin/backup').then(...)</script>` in the name.
2. CSP prevents inline script execution (`script-src 'self'`).
3. React's JSX auto-escaping prevents the script from rendering as executable HTML.

**Impact:** None — CSP and React's built-in XSS protection prevent script execution.

**Residual Risk:** If a developer uses `dangerouslySetInnerHTML` or constructs HTML strings, XSS could occur. Code review must prohibit these patterns.

### 5.4 Scenario: Network Attacker on LAN

**Attacker:** On the same LAN as the application, attempting to intercept traffic.

**Attack Path:**
1. Attacker attempts to sniff HTTP traffic between user and application.
2. Caddy enforces HTTPS (redirects HTTP to HTTPS).
3. Even if the attacker is on the Docker network, traffic between Caddy and the app is HTTP, but this is within the trusted Docker network boundary.

**Impact:** None — HTTPS is enforced for external traffic. Internal Docker traffic is within a trust boundary.

**Residual Risk:** If the Caddy HTTPS configuration is misconfigured (e.g., `auto_https off` without proper TLS), traffic could be sent in cleartext. Verify the Caddyfile enforces TLS.

### 5.5 Scenario: Stolen AUTH_SECRET

**Attacker:** Obtains the `AUTH_SECRET` environment variable (e.g., from a leaked `.env.local` file or container environment).

**Attack Path:**
1. Attacker forges JWT tokens with arbitrary `id`, `role`, and `canViewAll` values.
2. Attacker signs them with the stolen `AUTH_SECRET`.
3. Attacker accesses all endpoints as admin.

**Impact:** Full system compromise.

**Mitigation:** `AUTH_SECRET` must be kept secret. It's stored in `.env.local` (gitignored) or Docker environment variables. If compromised, rotate immediately:
```bash
NEW_SECRET=$(openssl rand -base64 32)
# Update .env.local or docker-compose.yml
docker compose down && docker compose --profile https up -d
```

**Prevention:** Never commit `.env.local` to git. Use Docker secrets or a secrets manager in production.

---

## 6. Security Controls Summary

### 6.1 Implemented Controls

| Control | Implementation | Threats Mitigated |
|---------|---------------|-------------------|
| TLS/HTTPS | Caddy reverse proxy with TLS termination | S-02, D-05 |
| Content Security Policy | `next.config.ts` headers | S-02, T-01 (partial) |
| SameSite=Strict cookies | NextAuth session configuration | T-01 |
| Origin/Referer validation | `validateOriginOrReferer()` in `api-utils.ts` | T-01 |
| Password hashing | bcrypt cost factor 10 | S-01 |
| JWT signing | NextAuth v5 with `AUTH_SECRET` | S-03 |
| Rate limiting | Caddy `rate_limit` directive | S-01, DoS-01 |
| RBAC | `canViewAllData()`, `canEditOthersData()`, `canManageUsers()` | D-01, E-01, E-02 |
| Zod input validation | All API inputs validated through schemas | T-02, T-03 |
| Status transition validation | `isValidTransition()` in `constants.ts` | T-04 |
| SQL injection prevention | Drizzle ORM parameterized queries | T-02 |
| Photo authentication | Photos served via authenticated API route | D-03 |
| Photo path security | UUID filenames, null byte stripping, type/size validation | T-06 |
| Session invalidation | `passwordChangedAt` vs JWT `iat` | S-02 |
| Setup lock | `app_config.setup_complete` flag | S-04, E-03 |
| Backup validation | Zod schema validation before restore | T-05 |
| Transactional integrity | SQLite transactions for multi-table mutations | Data integrity |
| Read-only container | Docker `read_only: true` with tmpfs | T-06, D-05 |
| Generic error messages | Production hides internal details | D-04 |
| Ownership checks | `ownerId` verification on all data endpoints | D-01 |
| Admin self-protection | Cannot deactivate or demote own account | E-04 (partial) |

### 6.2 Gaps and Recommendations

| Gap | Threats | Recommendation | Priority |
|-----|--------|----------------|----------|
| No audit logging | R-01 | Add `audit_log` table for all mutations | P6 |
| No photo storage quota | DoS-03 | Add per-user or per-instance photo limit | P7 |
| No request body size limit for restore | DoS-04 | Add 50MB body size limit for `/api/admin/restore` | P8 |
| No account lockout for admin | S-01 | Consider lockout for admin accounts only | P9 |
| No backup admin count validation | T-05 | Validate at least one admin exists after restore | P3 |
| `dangerouslySetInnerHTML` risk | S-02 | Lint rule to prohibit `dangerouslySetInnerHTML` | P10 |
| No DDoS protection | DoS-01 | Consider Cloudflare/CDN for production | P13 |

---

## 7. Attack Tree: Admin Account Compromise

```
Goal: Gain admin access to Resell Inventory Manager
│
├── 1. Steal admin credentials
│   ├── 1.1 Brute force login (5 req/15min rate limit) → SLOW
│   ├── 1.2 Phish admin email/password → POSSIBLE
│   ├── 1.3 Credential stuffing (if admin reuses password) → POSSIBLE
│   └── 1.4 Read AUTH_SECRET from leaked config → CRITICAL if leaked
│
├── 2. Steal admin session
│   ├── 2.1 XSS to steal cookie (CSP blocks inline scripts) → DIFFICULT
│   ├── 2.2 Network sniffing (HTTPS enforced) → VERY DIFFICULT
│   └── 2.3 Access browser storage (requires physical access) → OUTSIDE THREAT MODEL
│
├── 3. Escalate standard user to admin
│   ├── 3.1 Send PUT /api/profile with { role: "admin" } → BLOCKED by Zod schema
│   ├── 3.2 Send PUT /api/admin/users/[id] with own user → BLOCKED by admin-only check
│   └── 3.3 Exploit mass assignment in any endpoint → NEEDS CODE REVIEW
│
├── 4. Create new admin via setup
│   ├── 4.1 POST /api/setup (already has admin) → BLOCKED by setup_complete flag
│   └── 4.2 POST /api/admin/setup-unlock then POST /api/setup → REQUIRES EXISTING ADMIN
│
└── 5. Modify database directly
    ├── 5.1 Access SQLite file on server → REQUIRES SERVER ACCESS
    └── 5.2 Restore tampered backup → REQUIRES ADMIN CREDENTIALS
```

**Most likely attack paths:** 1.2 (phishing) and 1.3 (credential stuffing). **Most impactful:** 1.4 (AUTH_SECRET leak) gives full access without admin credentials.

**Mitigation priority:** Protect `AUTH_SECRET` at all costs. Implement strong admin password requirements (already 8+ chars with complexity). Consider MFA for admin accounts in a future version.

---

## 8. Security Testing Checklist

Use this checklist to verify all mitigations are correctly implemented:

- [ ] **S-01:** Attempt 6+ failed logins from same IP → should be rate-limited by Caddy (429 response)
- [ ] **S-03:** Modify JWT payload and submit → should return 401 (invalid signature)
- [ ] **S-04:** Access `/setup` after admin creation → should redirect to `/login`
- [ ] **T-01:** Submit POST request without Origin/Referer header → should return 403
- [ ] **T-01:** Submit POST request with mismatched Origin → should return 403
- [ ] **T-02:** Attempt SQL injection in search field (`' OR 1=1 --`) → should return empty results, not all records
- [ ] **T-03:** Send `PUT /api/profile` with `{ "role": "admin" }` → should return 400 (field not in schema)
- [ ] **T-03:** Send `POST /api/inventory` with `{ "ownerId": 999 }` → should use session user's ID, not 999
- [ ] **T-04:** Update item status from `sold` to `available` → should return 400 (invalid transition)
- [ ] **T-05:** Upload backup JSON with `role: "superadmin"` → should return 400 (invalid enum)
- [ ] **T-06:** Upload photo with filename `../../../etc/passwd` → should store with UUID filename, not path traversal
- [ ] **D-01:** As user A, access `GET /api/inventory/[userB_item_id]` → should return 403
- [ ] **D-01:** As user A with `canViewAll`, access `GET /api/inventory/[userB_item_id]` → should return 200
- [ ] **D-01:** As user A with `canViewAll`, attempt `DELETE /api/inventory/[userB_item_id]` → should return 403
- [ ] **D-02:** Access `GET /api/admin/users` → response should NOT include `password_hash`
- [ ] **D-03:** Access `GET /api/photos/[itemId]/[filename]` without session → should return 401
- [ ] **D-04:** Trigger an internal error in production → should return generic message, not stack trace
- [ ] **E-01:** As regular user, access `POST /api/admin/users` → should return 403
- [ ] **E-02:** As `canViewAll` user, attempt `PUT /api/inventory/[other_user_item]` → should return 403
- [ ] **E-03:** As regular user, call `POST /api/admin/setup-unlock` → should return 403
- [ ] **Session invalidation:** Change password, then use old JWT → should return 401

---

## 9. Threat Model Maintenance

This threat model should be reviewed and updated when:

1. **New features are added** — especially new API endpoints, new data types, or new user roles.
2. **Architecture changes** — e.g., migration to PostgreSQL, addition of WebSocket support, mobile API.
3. **Security incidents occur** — update mitigations based on any actual attacks.
4. **Dependencies are updated** — especially NextAuth, Drizzle ORM, or Caddy version changes.
5. **At least annually** — even if no changes have occurred, to reassess risk levels.

Each review should:
- Re-evaluate all threats in Section 2 for continued relevance
- Check if any new threats have emerged from changes
- Update the risk matrix (Section 3) based on new mitigations or new threats
- Verify the security testing checklist (Section 8) still covers all mitigations
- Update the attack tree (Section 7) if the attack surface has changed