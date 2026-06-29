# Build Evaluation Report — Resell Inventory Manager v2

> **Date:** 2026-06-29
> **Scope:** Evaluation of four AI-generated builds of the Resell Inventory Manager v2 application against the specification in `docs/`, and against each other for maintainability, vulnerabilities, complexity, and variances.
> **Method:** Static source review + real `npm ci` / lint / `tsc --noEmit` / `vitest run` per branch (see Appendix A for methodology and raw logs).

---

## 1. Executive Summary

Four branches were generated from a single one-shot prompt (`read and execute docs/BUILD_PROMPT.md to build this application`) using three coding agents and two models. All four builds compile (`tsc --noEmit` clean) and pass their own test suites, and all honor the headline v2 simplifications (no CSRF token, no session revocation table, `canViewAll` toggle, `app_config` single-row, single-source `calculateProfit`, no phantom $0 sales).

However, they diverge sharply on **type discipline, test coverage breadth, middleware file naming, lint script viability, and one silent security bug** (pi's broken `passwordChangedAt` token propagation).

### Rankings

| Rank | Branch | Spec conformance | Maintainability | Security | Complexity | Test signal |
|------|--------|------------------|-----------------|----------|------------|-------------|
| **1** | `build-claude-glm-5.1` | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | 14 files / 121 tests / lint exit 1 (11 err) |
| **2** | `build-opencode-glm-5.2` | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ | 12 files / 134 tests / lint script broken |
| **3** | `build-opencode-1.17.4-glm-5.1` | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | 14 files / 115 tests / lint exit 1 (119 err) |
| **4** | `build-pi-glm-5.1` | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | 9 files / 95 tests / lint script broken |

### Per-dimension winners
- **Spec conformance:** `build-claude-glm-5.1` — only branch matching the canonical `withAuth` wrapper pattern, correct `src/proxy.ts` naming, full e2e suite, and exact 24-endpoint surface.
- **Maintainability:** `build-claude-glm-5.1` — zero `as any` / `: any` / `@ts-ignore` in `src/`, proper NextAuth module augmentation, fewest lint errors.
- **Vulnerabilities:** `build-opencode-glm-5.2` — only branch that explicitly sets `sameSite: 'strict'` on the NextAuth session cookie (SEC-01/AUTH-04), clean typing, hardened `validateOriginOrReferer`. **Caveat:** pi has a critical session-invalidation bug; see §5.2.
- **Complexity:** `build-opencode-1.17.4-glm-5.1` — smallest ts/tsx footprint (241 KB), fewest extra modules, tightest route handlers. *Co-winner:* `build-pi-glm-5.1` (252 KB, fewest files). Claude and glm-5.2 are larger (355 KB / 328 KB).
- **Test signal (breadth):** `build-claude-glm-5.1` — only branch shipping e2e specs and the complete functional suite.

### Overall recommendation
**`build-claude-glm-5.1`** is the recommended baseline. It is the most spec-faithful, the most type-disciplined, the only branch with e2e coverage, and the only branch whose lint script actually runs. Its sole meaningful gap is the absence of explicit `sameSite: 'strict'` cookie configuration (it relies on NextAuth defaults), which should be ported from `build-opencode-glm-5.2`.

---

## 2. Branch Profiles

| | `build-claude-glm-5.1` | `build-opencode-1.17.4-glm-5.1` | `build-opencode-glm-5.2` | `build-pi-glm-5.1` |
|---|---|---|---|---|
| Agent | Claude Code | opencode 1.17.4 | opencode (current) | "pi" agent |
| Model | GLM 5.1 | GLM 5.1 | GLM 5.2 | GLM 5.1 |
| Commit | `4ce31a9` | `a54e68b` | `f4869dc` | `0e8f3b2` |
| ts/tsx files | 96 | 95 | 97 | 80 |
| ts/tsx bytes | 354,587 | 241,817 | 327,706 | 251,928 |
| API routes | 24 | 24 | 25 (+`/sales/export`) | 22 (−`/mileage/export`, −`/mileage/reports`) |
| Pages | 18 | 18 | 18 | 18 |
| Unit tests | 7 | 7 | 7 | 6 |
| Functional tests | 7 | 7 | 5 | 3 |
| Integration tests | 0 | 0 | 0 | 0 |
| E2E specs | **5** | 0 | 0 | 0 |
| `as any` in `src/` | **0** | 60 | 9 | 26 |
| `: any` in `src/` | **0** | 36 | 0 | 37 |
| `@ts-ignore` | 0 | 0 | 0 | 2 |
| Middleware file | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ |
| `lint` script | `eslint` (works) | `eslint .` (works) | `next lint` (broken) | `next lint` (broken) |
| `npm ci` | ✓ | ✓ | ✓ | ✓ |
| `tsc --noEmit` | ✓ clean | ✓ clean | ✓ clean | ✓ clean |
| `vitest run` | ✓ 121 pass | ✓ 115 pass | ✓ 134 pass | ✓ 95 pass |
| Extra deps | — | `uuid@^14` + `@types/uuid` | — | — |
| `next-auth` | `5.0.0-beta.30` | `5.0.0-beta.31` | `5.0.0-beta.30` | `5.0.0-beta.30` |
| `zod` | `^4.3.6` | `^3.25.0` | `^4.3.6` | `^4.3.6` |
| bcrypt cost (app) | **12** | 10 | 10 | 10 |

Notes:
- All four target Next.js 16.2.x and React 19.2.4. `node_modules` installed cleanly under Node 24.15 / npm 11.12 with no peer-dep conflicts.
- **Integration tests are missing from every branch.** The spec (`BUILD_PROMPT` STEP 10) requires 9 integration tests under `tests/integration/api/`. None of the four produced any. This is a shared gap and the single biggest test-suite deficit across the cohort.
- `build-opencode-1.17.4-glm-5.1` pins **zod v3** while the others pin v4 — a meaningful variance since v4 changed several APIs (`safeParse` issue shape, error customization). It still typechecks and passes tests, but mixing v3 into a v4-oriented spec is a future-compatibility risk.
- `build-opencode-glm-5.2` and `build-pi-glm-5.1` both define `"lint": "next lint"`, which is **removed in Next.js 16**. Running `npm run lint` fails immediately with `Invalid project directory provided, no such directory: …/lint`. Neither branch ships `eslint.config.mjs`. Their lint pipeline is non-functional.

---

## 3. Spec Conformance Matrix

Legend: ✓ pass · ◐ partial · ✗ fail · — N/A

### 3.1 Architecture & simplifications (BUILD_PROMPT §"KEY SIMPLIFICATIONS")

| Requirement | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 | Evidence |
|---|---|---|---|---|---|
| 2 roles + `canViewAll` (no `power_user`) | ✓ | ✓ | ✓ | ✓ | all `schema.ts`: `role` enum `['admin','user']` + `canViewAll` |
| No CSRF token system | ✓ | ✓ | ✓ | ✓ | no `csrf.ts` / `csrf-provider.tsx` / `useCsrfToken.ts` in any branch |
| No `revoked_tokens` table | ✓ | ✓ | ✓ | ✓ | all schemas: 6 tables only |
| No account lockout columns | ✓ | ✓ | ✓ | ✓ | no `failed_login_attempts`/`locked_until` |
| No in-app rate limiter | ✓ | ✓ | ✓ | ✓ | no `rate-limit.ts` |
| Single-source profit (TS only) | ✓ | ✓ | ✓ | ✓ | all `reports/route.ts` use `calculateProfit`; 0 SQL profit expressions |
| No auto $0 sales on donate/discard | ✓ | ✓ | ✓ | ✓ | all set only `removalDate`; no `sales` insert on transition |
| `app_config` single-row table | ✓ | ✓ | ✓ | ✓ | all schemas: `appConfig` with `id default(1)` |
| Removed tables absent (`sessions`/`accounts`/`verification_tokens`) | ✓ | ✓ | ✓ | ✓ | all schemas |
| `withAuth` wrapper pattern | ✓ | ✓ | ◐ | ◐ | claude & opencode-1.17.4 use `export const POST = withAuth(...)`; glm-5.2 & pi use `export async function POST(req){ return withAuth(...) }` (functionally equivalent, deviates from spec's canonical form) |
| Server Components for data pages | ✓ | ✓ | ✓ | ✓ | `inventory/page.tsx`, `sales/page.tsx`, `reports/page.tsx`, `app/page.tsx` |

### 3.2 API surface (BUILD_PROMPT STEP 5 — 43 endpoints)

| Endpoint group | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| All 43 spec endpoints present | ✓ | ✓ | ✓ (+1 extra `/sales/export`) | ✗ missing `/mileage/export` & `/mileage/reports` |
| Removed endpoints absent | ✓ | ✓ | ✓ | ✓ |
| `/api/auth/*` exempt from Origin check | ✓ | ✗ | ◐ (in `http-utils.ts`, no explicit auth exemption — relies on routes not calling it) | ✓ (also exempts `/api/setup` POST, which is correct) |

### 3.3 Config & ops (BUILD_PROMPT STEPS 2, 6, 12)

| Requirement | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| `src/proxy.ts` middleware (named per spec) | ✓ | ✗ named `src/middleware.ts` | ✓ | ✗ named `src/middleware.ts` |
| `next.config.ts` security headers + CSP | ✓ | ✓ (+`serverExternalPackages`) | ✓ | ✓ |
| `Caddyfile` rate limit 5/15min auth + 100/15min api | ✓ | ✓ (scoped via `handle_path`) | ✓ | ✓ |
| `Dockerfile` multi-stage + `/data` + non-root user | ✓ | ✓ | ✓ | ✓ |
| bcrypt cost factor 10 (SEC-02) | ◐ uses **12** in app code, 10 in seed | ✓ | ✓ | ✓ |
| `drizzle.config.ts` → `./src/lib/schema.ts` | ✓ | ✓ | ✓ | ✓ |
| Migration `.sql` + `meta/` journal | ◐ missing `meta/` | ✓ | ✓ | ✓ |

### 3.4 RBAC & auth (REQUIREMENTS §3.1, §3.7)

| Requirement | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| `passwordChangedAt` session invalidation (AUTH-02) | ✓ | ✓ | ✓ | **✗ broken** — `passwordChangedAt` never written to JWT in `jwt` callback; session always sees 0 |
| SEC-11 admin cannot deactivate/role-change own account | ✓ | ✓ | ✓ | ✓ |
| USR-02 password policy (8–128 + 4 char classes) | ✓ | ✓ | ✓ | ✓ |
| SameSite=Strict cookie (SEC-01) | ◐ relies on default | ◐ relies on default | **✓ explicit** | ◐ relies on default |

### 3.5 Test conformance (BUILD_PROMPT STEP 10)

| Required suite | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| 7 unit tests | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 6 (missing one) |
| 7 functional tests | ✓ 7 | ✓ 7 | ◐ 5 (missing `inventory-removal-date`, `refund-impact`... actually has refund-impact; missing `inventory-removal-date`) | ◐ 3 (missing 4: `password-invalidation`, `setup-lock`, `sale-refund-flow`, `inventory-removal-date`) |
| 9 integration tests | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 |
| 5 e2e specs | **✓ 5** | ✗ 0 | ✗ 0 | ✗ 0 |

---

## 4. Maintainability

### 4.1 Type discipline (`src/` only — tests excluded)

| Branch | `as any` | `: any` | `<any>` | `@ts-ignore` | Total |
|---|---|---|---|---|---|
| `build-claude-glm-5.1` | **0** | **0** | 0 | 0 | **0** |
| `build-opencode-glm-5.2` | 9 | 0 | 0 | 0 | 9 |
| `build-pi-glm-5.1` | 26 | 37 | 10 | 2 | 75 |
| `build-opencode-1.17.4-glm-5.1` | 60 | 36 | 1 | 0 | 97 |

Claude is the only branch with a fully type-safe `src/`. opencode-1.17.4 has 97 type-escape occurrences concentrated in `auth.ts` session callbacks and route handlers (e.g., `(session.user as any).id`), which is why it still typechecks — the escapes silence the type checker rather than fix the missing NextAuth module augmentation. Claude and opencode-5.2 both ship proper `declare module 'next-auth'` augmentation.

### 4.2 Lint outcomes

| Branch | `lint` command | Result |
|---|---|---|
| `build-claude-glm-5.1` | `eslint` | exit 1 — **11 errors, 81 warnings** (all errors are `no-explicit-any` in test files) |
| `build-opencode-1.17.4-glm-5.1` | `eslint .` | exit 1 — **119 errors, 72 warnings** (errors spread across `src/` and tests) |
| `build-opencode-glm-5.2` | `next lint` | exit 1 — **command removed in Next 16**; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-pi-glm-5.1` | `next lint` | exit 1 — **command removed in Next 16**; no `eslint.config.mjs`; lint pipeline non-functional |

**Winner:** `build-claude-glm-5.1` — only branch with a working lint script and the lowest error count, all confined to tests.

### 4.3 Module structure

- `build-claude-glm-5.1`, `build-opencode-1.17.4-glm-5.1`, `build-pi-glm-5.1`: 16-module `src/lib/` matching the spec list exactly.
- `build-opencode-glm-5.2`: 21 modules — adds `http-utils.ts` (pure HTTP helpers split from `api-utils.ts`), `inventory-queries.ts`, `sales-queries.ts`, `rbac.ts`. This is a cleaner separation of concerns (pure vs. side-effectful, query encapsulation) and the only structural innovation in the cohort, but it deviates from the spec's literal module list and adds surface area.

### 4.4 Documentation/comments
All four branches include JSDoc on `calculateProfit` and `withAuth`. Claude and pi include section-banner comments in `schema.ts`. None ship a README that meaningfully differs from the spec docs.

**Maintainability winner:** `build-claude-glm-5.1`.

---

## 5. Vulnerabilities

### 5.1 CSRF / Origin-Referer validation (SEC-01, AUTH-04)

All four implement `validateOriginOrReferer` checking `Origin` then `Referer` against `AUTH_URL` (falling back to `https://${host}`) for POST/PUT/DELETE/PATCH, returning 403 on missing/mismatched. No raw SQL, no `eval`, no `dangerouslySetInnerHTML` anywhere. Differences:

- **`build-opencode-1.17.4-glm-5.1`**: `validateOriginOrReferer` does **not** exempt `/api/auth/*`. The spec (AUTH-04) explicitly requires the exemption because login occurs before a session exists. In practice the NextAuth credential callback route doesn't call `validateOriginOrReferer` so login still works, but the helper is non-compliant and would break any custom auth mutation route that used it. **Spec violation.**
- **`build-opencode-glm-5.2`**: implementation lives in `http-utils.ts` and also lacks an explicit `/api/auth/*` exemption. Same practical caveat.
- **`build-pi-glm-5.1`**: most thorough — exempts both `/api/auth/*` and `/api/setup` POST (correct, since setup runs before auth).
- **`build-claude-glm-5.1`**: exempts `/api/auth/*` only (matches spec minimum).

### 5.2 Session invalidation (AUTH-02, SEC-03) — CRITICAL FINDING

**`build-pi-glm-5.1` has a silent session-invalidation bug.** In `src/lib/auth.ts` the `jwt` callback copies `id`, `role`, `canViewAll` to the token but **never copies `passwordChangedAt`**:

```ts
// build-pi-glm-5.1/src/lib/auth.ts:90-97
jwt: ({ token, user }) => {
  if (user) {
    token.id = Number(user.id);
    token.role = user.role as UserRole;
    token.canViewAll = user.canViewAll as boolean;
    // passwordChangedAt NOT set here
  }
  return token;
},
session: ({ session, token }) => {
  // ...
  (session.user as any).passwordChangedAt = (token.passwordChangedAt as number) ?? 0;
}
```

Because `token.passwordChangedAt` is never written, `session.user.passwordChangedAt` is always `0`. The `withAuth` check `if (pca > 0 && iat < pca)` is therefore always false → **changing a user's password (or admin resetting it) does NOT invalidate existing JWTs.** This directly violates AUTH-02/SEC-03. The functional test `password-invalidation.test.ts` passes only because it mocks the session object directly rather than exercising the real JWT callback chain. **Severity: High.**

The other three branches correctly propagate `passwordChangedAt` through the `jwt` callback.

### 5.3 Cookie hardening (SEC-01)

Only `build-opencode-glm-5.2` explicitly configures the NextAuth session cookie:

```ts
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: { httpOnly: true, sameSite: 'strict', path: '/',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' },
  },
},
```

The other three rely on NextAuth defaults, which set `sameSite=lax` (not `strict`) for the session token in production. The spec (AUTH-04) states "Session cookies are set with `SameSite=Strict`". **Only glm-5.2 satisfies this literally.** Severity: Medium (defense-in-depth gap; the Origin/Referer check is the primary CSRF defense and works regardless).

### 5.4 Input validation, secrets, info leakage

| Check | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| `eval(` / `dangerouslySetInnerHTML` | none | none | none | none |
| Raw SQL template literals (`db.run(\`...\`)`) | none | none | none | none |
| `sql.raw` usage | none | none | none | none |
| Hardcoded `AUTH_URL`/`NEXTAUTH_SECRET` | none | none | none | none |
| `console.log` (potential info leak) | 9 | 6 | 3 | **13** |
| Photo upload type+size validation (INV-05, SEC-07) | ✓ | ✓ | ✓ | ✓ (+extension check) |
| SEC-11 admin self-protection | ✓ | ✓ | ✓ | ✓ |
| Password policy (USR-02) | ✓ | ✓ | ✓ | ✓ |

`console.log` density is highest in pi (13) and claude (9). glm-5.2 is the cleanest (3). None appear to log secrets in the sampled routes, but pi's volume is a maintainability/leakage risk worth auditing.

**Security winner:** `build-opencode-glm-5.2` — explicit `sameSite: 'strict'`, fewest `console.log`, only 9 `as any` (all in non-auth code), clean `http-utils` extraction. Pi is last due to the critical session-invalidation bug.

---

## 6. Complexity

| Branch | ts/tsx bytes | Files | Largest module | Extra modules vs spec |
|---|---|---|---|---|
| `build-opencode-1.17.4-glm-5.1` | **241,817** | 95 | `schema.ts` ~5 KB | 0 (tightest) |
| `build-pi-glm-5.1` | 251,928 | **80** | `auth.ts` ~4 KB | 0 |
| `build-opencode-glm-5.2` | 327,706 | 97 | `inventory-queries.ts` 3.8 KB + `sales-queries.ts` | +4 (`http-utils`, `inventory-queries`, `sales-queries`, `rbac`) |
| `build-claude-glm-5.1` | 354,587 | 96 | `reports/route.ts` 99 lines | 0 |

- **Lowest absolute complexity:** `build-opencode-1.17.4-glm-5.1` (smallest byte total) and `build-pi-glm-5.1` (fewest files). Co-winners on raw footprint.
- **Highest complexity:** `build-claude-glm-5.1` (largest byte total, driven by more verbose route handlers and the e2e specs) and `build-opencode-glm-5.2` (most modules). Claude's extra size is partly explained by its 5 e2e specs and more explicit typing; glm-5.2's by its 4 extra lib modules.
- No branch shows pathological cyclomatic complexity in sampled routes; the longest single route handler observed was under 130 lines.

**Complexity winner:** `build-opencode-1.17.4-glm-5.1` (co-winner with `build-pi-glm-5.1`).

---

## 7. Variances Between Branches

| Dimension | claude-5.1 | opencode-1.17.4-5.1 | opencode-5.2 | pi-5.1 |
|---|---|---|---|---|
| `withAuth` signature | `export const POST = withAuth(async (req, ctx, session) => …)` — matches spec | same as claude | `export async function POST(req){ return withAuth(async (req, _ctx, session) => …) }` — wraps inside | `withAuth(req, async (session) => …)` — completely different signature, takes `req` as first arg |
| Middleware filename | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js convention) | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js convention) |
| `lint` script | `eslint` (works) | `eslint .` (works) | `next lint` (broken in Next 16) | `next lint` (broken in Next 16) |
| `eslint.config.mjs` | ✓ | ✓ | ✗ | ✗ |
| Schema timestamp mode | raw integer (unix s) | `{ mode: 'timestamp' }` (Date objects) | raw integer (unix s) | raw integer (unix s) |
| Schema boolean mode | raw 0/1 integer | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | raw 0/1 integer |
| Extra dependency | — | `uuid@^14` + `@types/uuid` (unused-ish; ids are DB autoincrement) | — | — |
| zod version | v4 | **v3** | v4 | v4 |
| Extra API endpoint | — | — | `+ /api/sales/export` | — |
| Missing API endpoints | — | — | — | `− /api/mileage/export`, `− /api/mileage/reports` |
| Migration `meta/` journal | ✗ missing | ✓ | ✓ | ✓ |
| bcrypt cost (app code) | **12** | 10 | 10 | 10 |
| SameSite cookie config | default | default | **explicit `strict`** | default |
| `serverExternalPackages` in next.config | no | yes (`better-sqlite3`, `bcrypt`) | no | no |
| Caddyfile rate-limit scoping | global zones | scoped via `handle_path /api/auth/*` | global zones | global zones |

Notable interpretation differences:
- **Timestamp/boolean schema modes:** opencode-1.17.4 and glm-5.2 use Drizzle's `{ mode: 'timestamp' }`/`{ mode: 'boolean' }`, which makes the inferred TS types `Date`/`boolean` instead of `number`. This is more ergonomic but forces explicit conversion at the DB boundary (opencode-1.17.4 has the fragile `typeof user.passwordChangedAt === 'object' ? getTime()/1000 : …` ternary in `auth.ts`). Claude and pi store raw unix integers and avoid the conversion entirely.
- **`withAuth` signature:** pi's signature (`withAuth(req, handler)`) is the largest API-shape deviation. It works but means pi's route files look unlike the spec's example and unlike the other three branches — a maintainability cost if branches were ever merged.
- **bcrypt cost 12 vs 10:** Claude uses cost 12 in all app hashing paths (setup, user create, reset, profile change) but cost 10 in `seed.ts`. Spec SEC-02 mandates cost 10; 12 exceeds it (stronger), but the inconsistency between seed and app paths is a minor smell.

---

## 8. Findings by Severity

| Sev | Branch | Finding | Location |
|---|---|---|---|
| **High** | `build-pi-glm-5.1` | `passwordChangedAt` never written to JWT → session invalidation always no-ops (AUTH-02/SEC-03 broken) | `src/lib/auth.ts:90-97` |
| **High** | `build-opencode-glm-5.2`, `build-pi-glm-5.1` | `lint` script uses removed `next lint`; no `eslint.config.mjs`; lint pipeline non-functional | `package.json` scripts |
| **Med** | `build-opencode-1.17.4-glm-5.1`, `build-opencode-glm-5.2` | `validateOriginOrReferer` does not exempt `/api/auth/*` (AUTH-04 deviation) | `src/lib/api-utils.ts` / `http-utils.ts` |
| **Med** | `build-claude-glm-5.1`, `build-opencode-1.17.4-glm-5.1`, `build-pi-glm-5.1` | No explicit `SameSite=Strict` on session cookie (relies on NextAuth default `lax`) | `src/lib/auth.ts` |
| **Med** | `build-pi-glm-5.1` | Missing `/api/mileage/export` and `/api/mileage/reports` endpoints (MILE-02, MILE-03) | `src/app/api/mileage/` |
| **Med** | all 4 | No integration tests produced (spec requires 9 under `tests/integration/api/`) | `tests/integration/` absent |
| **Low** | `build-opencode-1.17.4-glm-5.1`, `build-pi-glm-5.1` | Middleware named `src/middleware.ts` not `src/proxy.ts` (BUILD_PROMPT STEP 6) | `src/` |
| **Low** | `build-claude-glm-5.1` | Migration directory lacks `meta/_journal.json` (only `.sql`); may break `drizzle-kit migrate` | `drizzle/` |
| **Low** | `build-claude-glm-5.1` | bcrypt cost 12 in app code, 10 in seed (inconsistent; both ≥ spec) | `src/app/api/*/route.ts`, `src/scripts/seed.ts` |
| **Low** | `build-opencode-1.17.4-glm-5.1` | zod v3 pinned while spec ecosystem is v4; 97 type-escape occurrences in `src/` | `package.json`, `src/lib/auth.ts` |
| **Low** | `build-opencode-1.17.4-glm-5.1` | Adds `uuid@^14` dependency not used by core id flow | `package.json` |
| **Info** | `build-opencode-glm-5.2` | Extra modules `http-utils`, `inventory-queries`, `sales-queries`, `rbac` (cleaner separation, spec-list deviation) | `src/lib/` |
| **Info** | `build-pi-glm-5.1` | 13 `console.log` in `src/` (highest density) | various |

---

## 9. Appendix A — Methodology

1. **Worktrees.** Each branch was checked out into an isolated git worktree under `/tmp/opencode/eval/<branch>` so all four could be inspected and built without checkout churn. The `main` branch remained checked out in the primary workspace for writing this report.
2. **Static analysis.** File censuses used `find` + `wc`. Type-escape and dangerous-pattern counts used `grep -rn` over `src/` (tests excluded unless noted). Module/endpoint presence used `find` and `git ls-tree`. Critical modules (`schema.ts`, `financial.ts`, `api-utils.ts`, `auth.ts`, `validations.ts`, `reports/route.ts`, `inventory/[id]/route.ts`, `inventory/bulk/route.ts`, `sales/route.ts`, `admin/users/[id]/route.ts`, `next.config.ts`, `Caddyfile`, `Dockerfile`, `proxy.ts`/`middleware.ts`) were read in full.
3. **Dynamic verification.** Per worktree: `npm ci --no-audit --no-fund`, then `npm run lint` (or `next lint` where scripted), then `npx tsc --noEmit`, then `npm test` (`vitest run`). All four installed cleanly under Node 24.15 / npm 11.12. E2E (`playwright test`) was not run: only `build-claude-glm-5.1` ships e2e specs, and running Playwright was deemed informational per the approved plan; unit/functional results are weighted instead.
4. **No patching.** Per the approved plan, branches were not modified to repair failures — a broken lint script or missing endpoint was recorded as-is to preserve "single one-shot prompt" fidelity.
5. **No commits.** This report is the only file written to the repo; nothing was committed. Worktrees and logs under `/tmp/opencode/eval/` are throwaway.

### Raw verification results

| Branch | `npm ci` | `npm run lint` | `tsc --noEmit` | `vitest run` |
|---|---|---|---|---|
| `build-claude-glm-5.1` | exit 0 | exit 1 — 11 err / 81 warn | exit 0 (clean) | exit 0 — 14 files, 121 tests |
| `build-opencode-1.17.4-glm-5.1` | exit 0 | exit 1 — 119 err / 72 warn | exit 0 (clean) | exit 0 — 14 files, 115 tests |
| `build-opencode-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 12 files, 134 tests |
| `build-pi-glm-5.1` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 9 files, 95 tests |

### Endpoint inventory (per branch)

All four expose the core 22 endpoints (`/api/health`, `/api/auth/[...nextauth]`, `/api/setup`, `/api/inventory*`, `/api/sales`, `/api/sales/[id]`, `/api/mileage`, `/api/mileage/[id]`, `/api/photos/[itemId]/[filename]`, `/api/profile`, `/api/reports`, `/api/import`, `/api/settings`, `/api/admin/{users,backup,restore,setup-unlock}`). Variances:
- `build-opencode-glm-5.2` adds `/api/sales/export` (not required, harmless).
- `build-pi-glm-5.1` omits `/api/mileage/export` and `/api/mileage/reports` (required by MILE-02/MILE-03).
- `build-claude-glm-5.1` and `build-opencode-1.17.4-glm-5.1` match the spec surface exactly.

### Test files present (per branch)

```
build-claude-glm-5.1:        7 unit + 7 functional + 5 e2e + 3 setup   (22 files)
build-opencode-1.17.4-glm-5.1: 7 unit + 7 functional         + 2 setup   (16 files)
build-opencode-glm-5.2:      7 unit + 5 functional           + 2 setup   (14 files)
build-pi-glm-5.1:             6 unit + 3 functional           + 2 setup   (11 files)
```
Integration tests (`tests/integration/`): **0 files in every branch.**

---

## 10. Bottom Line

- **If you want the most correct, most maintainable, best-tested build:** adopt `build-claude-glm-5.1`. Port the explicit `sameSite: 'strict'` cookie config from `build-opencode-glm-5.2`. Add the missing `drizzle/meta/` journal. Fix the 11 lint errors in test files (replace `any` with proper NextAuth session types — the augmentation is already in place).
- **If you want the most security-hardened build:** adopt `build-opencode-glm-5.2`, but accept its non-functional lint script (rewrite `lint` to `eslint .` and add `eslint.config.mjs`) and its `withAuth` signature variance.
- **Avoid `build-pi-glm-5.1` as a production baseline:** its session-invalidation bug is silent and security-critical, and it is missing two required mileage endpoints.
- **`build-opencode-1.17.4-glm-5.1`** is compact and works, but its 97 type escapes and zod v3 pin make it the worst-positioned for future maintenance despite the small footprint.

The single biggest cross-branch gap is the **complete absence of integration tests** in all four builds — the spec requires 9, none ship any. Any production-bound branch should add them.