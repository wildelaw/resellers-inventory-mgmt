# Build Evaluation Report — Resell Inventory Manager v2

> **Date:** 2026-07-06 (updated)
> **Scope:** Evaluation of seven AI-generated builds of the Resell Inventory Manager v2 application against the specification in `docs/`, and against each other for maintainability, vulnerabilities, complexity, and variances.
> **Method:** Static source review + real `npm ci` / lint / `tsc --noEmit` / `vitest run` per branch (see Appendix A for methodology and raw logs).
> **Re-evaluation log:** 2026-07-06 — added `build-pi-glm-5.2` (pi 0.79.2 / GLM 5.2). Static analysis run on pi-5.2 only; existing branches were not re-analyzed (their prior results stand). Functional re-run NOT triggered (pi-5.2 expected ≤ claude-5.2's 100/100 ceiling). Rank deltas: `build-vscode-glm-5.2` 4→5, `build-opencode-glm-5.1` 5→6, `build-pi-glm-5.1` 6→7.

> **Note on `build-ibm-bob`:** An eighth branch, `build-ibm-bob`, was attempted but **did not complete** — the agent ran out of usage quota (lowest Pro plan) mid-build before finishing the implementation. Because a partial build cannot be fairly compared against completed builds, it is **excluded from the evaluation below**. The branch exists in the repository for reference but is not scored or ranked.

---

## 1. Executive Summary

Seven branches were generated from a single one-shot prompt (`read and execute docs/BUILD_PROMPT.md to build this application`) using four coding agents and two models. All seven compile (`tsc --noEmit` clean) and pass their own test suites, and all honor the headline v2 simplifications (no CSRF token, no session revocation table, `canViewAll` toggle, `app_config` single-row, single-source `calculateProfit`, no phantom $0 sales).

`build-claude-glm-5.2` remains the clear leader: it is the only branch that ships the 9 required integration tests, the only branch whose lint pipeline passes cleanly (zero errors, zero warnings), the only branch with a live-JWT-refresh callback that makes role/canViewAll/isActive changes take effect on existing sessions, and it combines the strengths of the prior leaders (claude-5.1's spec fidelity and type discipline + opencode-5.2's explicit SameSite=Strict cookie).

The newly added `build-pi-glm-5.2` is the GLM-5.2 successor to `build-pi-glm-5.1` (the prior cohort's last-place build). It fixes all three of pi-5.1's critical defects: the `passwordChangedAt` session-invalidation bug (now written to the JWT at login), the `src/middleware.ts` naming violation (now correctly `src/proxy.ts`), and the missing `/mileage/export` + `/mileage/reports` endpoints (all 24 now present). It also adds an explicit `sameSite: 'strict'` cookie, brings its test suite up to the spec-required counts (7 unit + 7 functional = 137 passing tests, more than any non-Claude branch), and keeps the spec-correct `calculateSalesTaxFromPrice` formula. However, it still has zero integration tests and zero e2e specs, a broken lint pipeline (`next lint` removed in Next 16, no `eslint.config.mjs`, legacy `.eslintrc.json`), 50 type-escape occurrences in `src/` (29 `as any` + 17 `: any` + 4 `<any>`), no `Origin` exemption for `/api/auth/*` or `/api/setup` (an AUTH-04 regression vs pi-5.1, which exempted both), and its JWT refresh is login-only (no live DB refresh of `passwordChangedAt`/`role`/`canViewAll`/`isActive`, so REG-06 will fail). It ranks #4, pushing `build-vscode-glm-5.2` to #5, `build-opencode-glm-5.1` to #6, and `build-pi-glm-5.1` to #7.

### Rankings

| Rank | Branch | Spec conformance | Maintainability | Security | Complexity | Test signal |
|------|--------|------------------|-----------------|----------|------------|-------------|
| **1** | `build-claude-glm-5.2` | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | **23 files / 186 tests / lint exit 0** |
| **2** | `build-claude-glm-5.1` | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | 14 files / 121 tests / lint exit 1 (11 err) |
| **3** | `build-opencode-glm-5.2` | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ | 12 files / 134 tests / lint script broken |
| **4** | `build-pi-glm-5.2` | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | 14 files / 137 tests / lint script broken |
| **5** | `build-vscode-glm-5.2` | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ | 9 files / 100 tests / lint script broken |
| **6** | `build-opencode-glm-5.1` | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | 14 files / 115 tests / lint exit 1 (119 err) |
| **7** | `build-pi-glm-5.1` | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | 9 files / 95 tests / lint script broken |

### Per-dimension winners
- **Spec conformance:** `build-claude-glm-5.2` — canonical `withAuth` wrapper, `src/proxy.ts` naming, exact 24-endpoint surface, full e2e suite, **and the only branch with all 9 required integration tests**. *Co-winner:* `build-claude-glm-5.1` (same pattern, same endpoints, but no integration tests and missing `drizzle/meta/`).
- **Maintainability:** `build-claude-glm-5.2` — zero `as any` / `: any` / `@ts-ignore` in `src/`, proper NextAuth module augmentation, **lint passes with zero errors and zero warnings** (only branch to do so), centralized bcrypt cost in `config.ts`.
- **Vulnerabilities:** `build-claude-glm-5.2` — explicit `sameSite: 'strict'` cookie (SEC-01), live JWT refresh of `passwordChangedAt`/`role`/`canViewAll`/`isActive` on every request (stronger than AUTH-02 minimum), `withAuth` also rejects deactivated accounts, `validateOriginOrReferer` exempts both `/api/auth/*` and `/api/setup` and rejects when no host can be established. *Co-winner:* `build-opencode-glm-5.2` (also has explicit SameSite, clean typing, but lacks the live-refresh and the extra `isActive` gate).
- **Complexity:** `build-pi-glm-5.2` — fewest files (72) and second-smallest byte total (282 KB). *Co-winner:* `build-opencode-glm-5.1` (smallest byte total, 241 KB). `build-pi-glm-5.1` is now third-smallest by files (80). `build-vscode-glm-5.2` remains notable for 85 files / 268 KB with near-full type safety. `build-claude-glm-5.2` is mid-pack on raw size (357 KB) but its extra modules (`api-client.ts`, `inventory-logic.ts`, `app-shell.tsx`, `client-shell.tsx`) are well-scoped architectural improvements rather than incidental surface area.
- **Test signal:** `build-claude-glm-5.2` — only branch with the complete 4-tier suite (7 unit + 7 functional + 9 integration + 5 e2e) and the only branch whose lint passes clean.

### Overall recommendation
**`build-claude-glm-5.2`** is the recommended baseline. It dominates or co-leads every dimension: most spec-faithful, fully type-safe, cleanest lint, complete test suite across all four tiers, security-hardened (explicit SameSite + live JWT refresh + `isActive` enforcement), and canonical patterns throughout (`withAuth`, `src/proxy.ts`, 24 endpoints, `drizzle/meta/`). It has no high- or medium-severity findings. The only notable observation is that it adds four modules beyond the spec's literal list (`api-client.ts`, `inventory-logic.ts`, `app-shell.tsx`, `client-shell.tsx`), all of which are well-justified refinements rather than deviations.

---

## 2. Branch Profiles

| | `build-claude-glm-5.2` | `build-claude-glm-5.1` | `build-opencode-glm-5.1` | `build-opencode-glm-5.2` | `build-pi-glm-5.2` | `build-vscode-glm-5.2` | `build-pi-glm-5.1` |
|---|---|---|---|---|---|---|---|
| Agent | Claude Code | Claude Code | opencode 1.17.4 | opencode (current) | "pi" agent | VS Code (GitHub Copilot) | "pi" agent |
| Agent version | Claude Code 2.1.196 | Claude Code 2.1.176 | opencode 1.17.4 | opencode 1.17.4 | pi 0.79.2 | VS Code 1.126.0 (GitHub Copilot) | pi 0.79.2 |
| Model | GLM 5.2 | GLM 5.1 | GLM 5.1 | GLM 5.2 | GLM 5.2 | GLM 5.2 | GLM 5.1 |
| Commit | `d951f31` | `4ce31a9` | `a54e68b` | `f4869dc` | `8f12e40` | `9e70fb6` | `0e8f3b2` |
| ts/tsx files | 111 | 96 | 95 | 97 | **72** | 85 | 80 |
| ts/tsx bytes | 356,980 | 354,587 | **241,817** | 327,706 | 282,459 | 267,796 | 251,928 |
| API routes | 24 | 24 | 24 | 25 (+`/sales/export`) | 24 | 24 | 22 (−`/mileage/export`, −`/mileage/reports`) |
| Pages | 18 | 18 | 18 | 18 | 17 | 18 | 18 |
| Unit tests | 7 | 7 | 7 | 7 | 7 | 7 | 6 |
| Functional tests | 7 | 7 | 7 | 5 | 7 | 2 | 3 |
| Integration tests | **9** | 0 | 0 | 0 | 0 | 0 | 0 |
| E2E specs | **5** | **5** | 0 | 0 | 0 | 1 | 0 |
| `as any` in `src/` | **0** | **0** | 60 | 9 | 29 | **1** | 26 |
| `: any` in `src/` | **0** | **0** | 36 | 0 | 17 | **0** | 37 |
| `<any>` in `src/` | 0 | 0 | 1 | 0 | 4 | 0 | 10 |
| `@ts-ignore` | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| Middleware file | `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ | `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ |
| `lint` script | `eslint .` (works) | `eslint` (works) | `eslint .` (works) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) |
| `eslint.config.mjs` | ✓ | ✓ | ✓ | ✗ | ✗ (legacy `.eslintrc.json`) | ✗ | ✗ |
| `npm ci` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `tsc --noEmit` | ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean |
| `vitest run` | ✓ **186 pass** | ✓ 121 pass | ✓ 115 pass | ✓ 134 pass | ✓ 137 pass | ✓ 100 pass | ✓ 95 pass |
| `npm run lint` | ✓ **exit 0 (0 err / 0 warn)** | exit 1 — 11 err / 81 warn | exit 1 — 119 err / 72 warn | exit 1 — `next lint` removed | exit 1 — `next lint` removed | exit 1 — `next lint` removed | exit 1 — `next lint` removed |
| Extra deps | — | — | `uuid@^14` + `@types/uuid` | — | — | — | — |
| `next-auth` | `5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.31` | `5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.30` |
| `zod` | `^4.3.6` | `^4.3.6` | `^3.25.0` | `^4.3.6` | `^4.3.6` | `^4.3.6` | `^4.3.6` |
| bcrypt cost (app) | 10 (centralized in `config.ts`) | **12** (inconsistent w/ seed) | 10 | 10 | 10 | 10 | 10 |
| SameSite cookie | **explicit `strict`** | default | default | **explicit `strict`** | **explicit `strict`** | default | default |

Notes:
- All seven target Next.js 16.2.x and React 19.2.4. `node_modules` installed cleanly under Node 24.15 / npm 11.12 with no peer-dep conflicts.
- **Only `build-claude-glm-5.2` ships the 9 required integration tests.** All others have zero.
- **Only `build-claude-glm-5.2` passes `npm run lint` with exit 0.** claude-5.1 and opencode-5.1 have working ESLint but emit errors; opencode-5.2, pi-5.2, vscode-5.2, and pi-5.1 use the removed `next lint` command.
- `build-pi-glm-5.2` is the second-smallest build by both file count (72) and byte total (282 KB) while shipping the most tests of any non-Claude branch (137). Its schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2) rather than raw integers.
- `build-vscode-glm-5.2` is the most type-safe non-Claude build (1 `as any` in `db.ts` Proxy, 0 `: any`, 0 `@ts-ignore`) and was the second-smallest by file count before pi-5.2. However, it has the thinnest test suite of the completed builds (9 files / 100 tests, only 2 functional tests and 1 e2e spec, no integration tests).
- `build-vscode-glm-5.2` has a **`calculateSalesTaxFromPrice` formula deviation**: it computes `price * rate` (tax to add to a tax-exclusive price) rather than the spec's `price - price/(1+rate)` (extract tax from a tax-inclusive price). Its own test passes because it tests the implementation, not the spec.
- `build-pi-glm-5.2` fixes all three of pi-5.1's critical defects: `passwordChangedAt` is now written to the JWT at login (was never written — session invalidation was a silent no-op), the middleware is named `src/proxy.ts` (was `src/middleware.ts`), and all 24 spec endpoints are present (was missing `/mileage/export` and `/mileage/reports`). It also adds explicit `sameSite: 'strict'`. However, it regresses on `validateOriginOrReferer`: unlike pi-5.1 (which exempted both `/api/auth/*` and `/api/setup`), pi-5.2 exempts neither — an AUTH-04 deviation shared with opencode-5.2 and vscode-5.2.
- `build-opencode-glm-5.1` pins **zod v3** while the others pin v4 — a future-compatibility risk.
- `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-pi-glm-5.1`, and `build-vscode-glm-5.2` all define `"lint": "next lint"`, which is **removed in Next.js 16**. Running `npm run lint` fails immediately. None ships `eslint.config.mjs`. pi-5.2 ships a legacy `.eslintrc.json` (ESLint v8 format), which ESLint v9 cannot read. Their lint pipelines are non-functional.

---

## 3. Spec Conformance Matrix

Legend: ✓ pass · ◐ partial · ✗ fail · — N/A

### 3.1 Architecture & simplifications (BUILD_PROMPT §"KEY SIMPLIFICATIONS")

| Requirement | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | Evidence |
|---|---|---|---|---|---|---|---|---|
| 2 roles + `canViewAll` (no `power_user`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all `schema.ts`: `role` enum `['admin','user']` + `canViewAll` |
| No CSRF token system | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `csrf.ts` / `csrf-provider.tsx` / `useCsrfToken.ts` in any branch |
| No `revoked_tokens` table | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas: 6 tables only |
| No account lockout columns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `failed_login_attempts`/`locked_until` |
| No in-app rate limiter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `rate-limit.ts` |
| Single-source profit (TS only) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all `reports/route.ts` use `calculateProfit`; 0 SQL profit expressions |
| No auto $0 sales on donate/discard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all set only `removalDate`; no `sales` insert on transition |
| `app_config` single-row table | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas: `appConfig` with `id default(1)` |
| Removed tables absent (`sessions`/`accounts`/`verification_tokens`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas |
| `withAuth` wrapper pattern | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | ◐ | claude-5.2 & claude-5.1 & opencode-5.1 & vscode-5.2 use `export const POST = withAuth(...)`; opencode-5.2 & pi-5.2 & pi-5.1 use `export async function POST(req){ return withAuth(...) }` (functionally equivalent, deviates from canonical form) |
| Server Components for data pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `inventory/page.tsx`, `sales/page.tsx`, `reports/page.tsx`, `app/page.tsx` |
| `calculateSalesTaxFromPrice` formula matches spec | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | vscode-5.2 uses `price * rate` (add tax) instead of `price - price/(1+rate)` (extract from tax-inclusive); pi-5.2 uses the spec formula correctly |

### 3.2 API surface (BUILD_PROMPT STEP 5 — 43 endpoints)

| Endpoint group | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| All 43 spec endpoints present | ✓ | ✓ | ✓ | ✓ (+1 extra `/sales/export`) | ✓ | ✓ | ✗ missing `/mileage/export` & `/mileage/reports` |
| Removed endpoints absent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/api/auth/*` exempt from Origin check | ✓ (also `/api/setup`) | ✓ | ✗ | ◐ (no explicit exemption) | ✗ no exemption | ✗ no exemption | ✓ (also `/api/setup` POST) |

### 3.3 Config & ops (BUILD_PROMPT STEPS 2, 6, 12)

| Requirement | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| `src/proxy.ts` middleware (named per spec) | ✓ | ✓ | ✗ named `src/middleware.ts` | ✓ | ✓ | ✓ | ✗ named `src/middleware.ts` |
| `next.config.ts` security headers + CSP | ✓ (+`serverExternalPackages`) | ✓ | ✓ (+`serverExternalPackages`) | ✓ | ✓ | ✓ | ✓ |
| `Caddyfile` rate limit 5/15min auth + 100/15min api | ✓ (scoped via `handle`) | ✓ | ✓ (scoped via `handle_path`) | ✓ | ✓ (global zones) | ✓ (global zones) | ✓ (global zones) |
| `Dockerfile` multi-stage + `/data` + non-root user | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| bcrypt cost factor 10 (SEC-02) | ✓ (centralized) | ◐ uses **12** in app code, 10 in seed | ✓ | ✓ | ✓ | ✓ | ✓ |
| `drizzle.config.ts` → `./src/lib/schema.ts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration `.sql` + `meta/` journal | ✓ | ◐ missing `meta/` | ✓ | ✓ | ✓ | ✓ | ✓ |

### 3.4 RBAC & auth (REQUIREMENTS §3.1, §3.7)

| Requirement | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| `passwordChangedAt` session invalidation (AUTH-02) | **✓+** live-refresh on every request | ✓ | ✓ | ✓ | ✓ login-only | ✓ | **✗ broken** — never written to JWT |
| `withAuth` also rejects deactivated accounts | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| SEC-11 admin cannot deactivate/role-change own account | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| USR-02 password policy (8–128 + 4 char classes) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SameSite=Strict cookie (SEC-01) | **✓ explicit** | ◐ relies on default | ◐ relies on default | **✓ explicit** | **✓ explicit** | ◐ relies on default | ◐ relies on default |

### 3.5 Test conformance (BUILD_PROMPT STEP 10)

| Required suite | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| 7 unit tests | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 6 |
| 7 functional tests | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 5 | ✓ 7 | ◐ 2 (missing 5: `password-invalidation`, `setup-lock`, `sale-refund-flow`, `inventory-removal-date`, `refund-impact`) | ◐ 3 |
| 9 integration tests | **✓ 9** | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 |
| 5 e2e specs | **✓ 5** | **✓ 5** | ✗ 0 | ✗ 0 | ✗ 0 | ◐ 1 (auth only) | ✗ 0 |

---

## 4. Maintainability

### 4.1 Type discipline (`src/` only — tests excluded)

| Branch | `as any` | `: any` | `<any>` | `@ts-ignore` | Total |
|---|---|---|---|---|---|
| `build-claude-glm-5.2` | **0** | **0** | 0 | 0 | **0** |
| `build-claude-glm-5.1` | **0** | **0** | 0 | 0 | **0** |
| `build-vscode-glm-5.2` | **1** | **0** | 0 | 0 | **1** |
| `build-opencode-glm-5.2` | 9 | 0 | 0 | 0 | 9 |
| `build-pi-glm-5.2` | 29 | 17 | 4 | 0 | 50 |
| `build-pi-glm-5.1` | 26 | 37 | 10 | 2 | 75 |
| `build-opencode-glm-5.1` | 60 | 36 | 1 | 0 | 97 |

Both Claude branches are fully type-safe in `src/`. `build-vscode-glm-5.2` is very close — its single `as any` is in `db.ts` line 43 (`(actualDb as any)[prop]`) inside the lazy Proxy pattern, a pragmatic escape for dynamic property forwarding. `build-pi-glm-5.2` has 50 type-escape occurrences spread across route handlers (`status as any`, `platform as any`, `role as any` for Drizzle column comparisons), client components (`initialItems as any`, `initialSales as any` for Server→Client prop passing), session access (`(session.user as any).passwordChangedAt` — the NextAuth module augmentation omits `iat`/`passwordChangedAt` from the typed session), and backup serialization (`allUsers as any` etc.). The session-typing escapes mirror opencode-5.1's pattern (silencing the type checker rather than completing the NextAuth `declare module` augmentation), though pi-5.2 does declare a `Session` augmentation — it just doesn't extend it far enough to cover `iat`/`passwordChangedAt` on the JWT token type. opencode-5.1 has 97 type-escape occurrences concentrated in `auth.ts` session callbacks (e.g., `(session.user as any).id`), which silence the type checker rather than fix the missing NextAuth module augmentation. Claude, opencode-5.2, pi-5.2, and vscode-5.2 all ship proper `declare module 'next-auth'` augmentation; vscode-5.2 and claude-5.2 also augment `@auth/core/jwt`.

### 4.2 Lint outcomes

| Branch | `lint` command | Result |
|---|---|---|
| `build-claude-glm-5.2` | `eslint .` | **exit 0 — 0 errors, 0 warnings** |
| `build-claude-glm-5.1` | `eslint` | exit 1 — 11 errors, 81 warnings (all errors are `no-explicit-any` in test files) |
| `build-opencode-glm-5.1` | `eslint .` | exit 1 — 119 errors, 72 warnings (errors spread across `src/` and tests) |
| `build-opencode-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-pi-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs` (ships legacy `.eslintrc.json` which ESLint v9 cannot read); lint pipeline non-functional |
| `build-pi-glm-5.1` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-vscode-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |

**Winner:** `build-claude-glm-5.2` — only branch with a fully clean lint pass.

### 4.3 Module structure

- `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-pi-glm-5.2`: 16-module `src/lib/` matching the spec list exactly.
- `build-claude-glm-5.2`: 19 modules — adds `api-client.ts` (typed client-side fetch helpers documenting the no-CSRF-token design), `inventory-logic.ts` (centralized status-transition + removalDate logic), plus `app-shell.tsx` (Server Component shell) and `client-shell.tsx` (client shell) in `src/components/`. Well-scoped architectural refinements.
- `build-opencode-glm-5.2`: 21 modules — adds `http-utils.ts`, `inventory-queries.ts`, `sales-queries.ts`, `rbac.ts`. Cleaner separation of concerns but deviates further from the spec's literal module list.
- `build-vscode-glm-5.2`: 16 modules matching the spec list exactly, with raw integer timestamps/booleans (like claude-5.2, no conversion needed). Schema uses `check` import from drizzle-orm (unused) — a minor leftover.
- `build-pi-glm-5.2`: 16 modules matching the spec list exactly. Schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2), making the inferred TS types `boolean`/`number` and avoiding the raw-integer conversion boilerplate of claude-5.2/pi-5.1/vscode-5.2.

### 4.4 Documentation/comments
All seven branches include JSDoc on `calculateProfit` and `withAuth`. `build-claude-glm-5.2` has the most thorough header comments — e.g. `auth.ts` opens with a multi-line block explaining the JWT refresh strategy and why it's necessary for AUTH-02. `build-pi-glm-5.2` includes concise JSDoc on `calculateProfit`, `validateOriginOrReferer`, and `withAuth`, plus inline comments on the profit formula ("SINGLE SOURCE OF TRUTH") and session-invalidation check, but lacks the longer architectural rationale of claude-5.2. `build-vscode-glm-5.2` includes concise JSDoc on all financial functions and the `withAuth` wrapper, but also lacks the longer architectural rationale comments of claude-5.2.

**Maintainability winner:** `build-claude-glm-5.2`.

---

## 5. Vulnerabilities

### 5.1 CSRF / Origin-Referer validation (SEC-01, AUTH-04)

All seven implement `validateOriginOrReferer` checking `Origin` then `Referer` against `AUTH_URL` (falling back to `https://${host}`) for POST/PUT/DELETE/PATCH, returning 403 on missing/mismatched. No raw SQL, no `eval`, no `dangerouslySetInnerHTML` anywhere. Differences:

- **`build-claude-glm-5.2`**: most robust — configurable `ORIGIN_EXEMPT_PREFIXES = ['/api/auth/', '/api/setup']` list, rejects with 403 when neither `AUTH_URL` nor `Host` can be established (defensive).
- **`build-pi-glm-5.1`**: also exempts both `/api/auth/*` and `/api/setup` POST (correct).
- **`build-claude-glm-5.1`**: exempts `/api/auth/*` only (matches spec minimum).
- **`build-opencode-glm-5.1`**, **`build-opencode-glm-5.2`**, **`build-pi-glm-5.2`**, **`build-vscode-glm-5.2`**: do **not** exempt `/api/auth/*`. Spec violation (AUTH-04) — in practice the NextAuth credential callback route doesn't call `validateOriginOrReferer` so login still works, but the helpers are non-compliant. Note: pi-5.2 is a regression here vs pi-5.1, which did exempt both.

### 5.2 Session invalidation (AUTH-02, SEC-03) — CRITICAL FINDING + NEW HARDENING

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
```

Because `token.passwordChangedAt` is never written, `session.user.passwordChangedAt` is always `0`. The `withAuth` check `if (pca > 0 && iat < pca)` is therefore always false → **changing a user's password (or admin resetting it) does NOT invalidate existing JWTs.** This directly violates AUTH-02/SEC-03. **Severity: High.** **This bug is FIXED in `build-pi-glm-5.2`**, which correctly writes `token.passwordChangedAt = user.passwordChangedAt` at login.

**`build-claude-glm-5.2` goes further than the spec requires** — its `jwt` callback refreshes `passwordChangedAt`, `role`, `canViewAll`, and `isActive` from the database on every request (not just at login), so role changes, `canViewAll` toggles, and deactivations take effect on existing JWTs. It also handles deleted users by forcing `passwordChangedAt = MAX_SAFE_INTEGER`. Additionally, `withAuth` checks `isActive === false` and rejects deactivated accounts immediately, which no other branch does.

The other five branches (claude-5.1, opencode-5.1, opencode-5.2, **pi-5.2**, vscode-5.2) correctly propagate `passwordChangedAt` through the `jwt` callback at login time, but do not live-refresh it — so an admin password reset sets `passwordChangedAt` on the user row, but existing JWTs issued before the reset still carry the old (lower) `passwordChangedAt` and are not rejected until the token expires. `build-pi-glm-5.2` is in this group: AUTH-02 is satisfied at login, but the functional E2E REG-06 scenario (admin resets password → existing session invalidated) will fail because the JWT's `passwordChangedAt` is frozen at login time. `build-vscode-glm-5.2` uses proper `declare module '@auth/core/jwt'` augmentation (like claude-5.2) so the token fields are typed without `as any`.

### 5.3 Cookie hardening (SEC-01)

`build-claude-glm-5.2`, `build-opencode-glm-5.2`, and `build-pi-glm-5.2` all explicitly configure the NextAuth session cookie:

```ts
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: { httpOnly: true, sameSite: 'strict', path: '/',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' },
  },
},
```

The other four (claude-5.1, opencode-5.1, pi-5.1, vscode-5.2) rely on NextAuth defaults, which set `sameSite=lax` (not `strict`). The spec (AUTH-04) states "Session cookies are set with `SameSite=Strict`". **Only claude-5.2, opencode-5.2, and pi-5.2 satisfy this literally.** Severity: Medium.

### 5.4 Input validation, secrets, info leakage

| Check | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| `eval(` / `dangerouslySetInnerHTML` | none | none | none | none | none | none | none |
| Raw SQL template literals | none | none | none | none | none | none | none |
| `sql.raw` usage | none | none | none | none | none | none | none |
| Hardcoded `AUTH_URL`/`NEXTAUTH_SECRET` | none | none | none | none | none | none | none |
| `console.log` (potential info leak) | 4 | 9 | 6 | 3 | 7 | 7 | **13** |
| Photo upload type+size validation (INV-05, SEC-07) | ✓ | ✓ | ✓ | ✓ | ✓ (+ext) | ✓ (+extension check) | ✓ (+ext) |
| SEC-11 admin self-protection | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Password policy (USR-02) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

`console.log` density is highest in pi-5.1 (13). claude-5.2 is cleanest (4), followed by opencode-5.2 (3). pi-5.2 (7) and vscode-5.2 (7) are mid-pack. None appear to log secrets in the sampled routes.

**Security winner:** `build-claude-glm-5.2` — explicit `sameSite: 'strict'`, live JWT refresh, `isActive` enforcement, defensive `validateOriginOrReferer`, fully type-safe, clean `console.log` profile. *Co-winner:* `build-opencode-glm-5.2` (also has explicit SameSite and clean typing, but lacks the live-refresh and `isActive` gate). `build-pi-glm-5.2` joins the explicit-SameSite tier but is held back by the missing `/api/auth/*` exemption and login-only JWT refresh. pi-5.1 is last due to the critical session-invalidation bug (now fixed in pi-5.2).

---

## 6. Complexity

| Branch | ts/tsx bytes | Files | Largest module | Extra modules vs spec |
|---|---|---|---|---|
| `build-opencode-glm-5.1` | **241,817** | 95 | `schema.ts` ~5 KB | 0 (tightest) |
| `build-pi-glm-5.1` | 251,928 | 80 | `auth.ts` ~4 KB | 0 |
| `build-vscode-glm-5.2` | 267,796 | 85 | `reports/route.ts` 104 lines | 0 |
| `build-pi-glm-5.2` | 282,459 | **72** | `reports/route.ts` | 0 |
| `build-opencode-glm-5.2` | 327,706 | 97 | `inventory-queries.ts` 3.8 KB + `sales-queries.ts` | +4 (`http-utils`, `inventory-queries`, `sales-queries`, `rbac`) |
| `build-claude-glm-5.1` | 354,587 | 96 | `reports/route.ts` 99 lines | 0 |
| `build-claude-glm-5.2` | 356,980 | 111 | `reports/route.ts` 112 lines | +4 (`api-client`, `inventory-logic`, `app-shell`, `client-shell`) |

- **Lowest absolute complexity:** `build-opencode-glm-5.1` (smallest byte total) and `build-pi-glm-5.2` (fewest files — 72, second-smallest bytes — 282 KB). Co-winners on raw footprint. `build-pi-glm-5.2` achieves the smallest file count in the cohort while shipping the most tests of any non-Claude branch (137) — a strong complexity-to-coverage ratio.
- **`build-vscode-glm-5.2`** remains notable for being the third-smallest by file count (85) and bytes (268 KB), while maintaining near-full type safety (1 `as any`).
- **Highest complexity:** `build-claude-glm-5.2` (largest byte total and file count, driven by the 9 integration tests + 4 extra well-scoped modules) and `build-opencode-glm-5.2` (most lib modules). Claude-5.2's extra size is largely explained by its complete test suite (which the spec requires) and architectural refinements.
- No branch shows pathological cyclomatic complexity in sampled routes; the longest single route handler observed was under 130 lines.

**Complexity winner:** `build-opencode-glm-5.1` (co-winner with `build-pi-glm-5.2`) on raw footprint. Note: `build-claude-glm-5.2` is the largest but its complexity is justified by test coverage and module decomposition that improves maintainability.

---

## 7. Variances Between Branches

| Dimension | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 |
|---|---|---|---|---|---|---|---|
| `withAuth` signature | `export const POST = withAuth(...)` — matches spec | same as claude-5.2 | same as claude-5.2 | wraps inside `async function POST` | wraps inside `async function POST` | `export const POST = withAuth(...)` — matches spec | `withAuth(req, handler)` — different signature |
| Middleware filename | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js) |
| `lint` script | `eslint .` (works, clean) | `eslint` (works) | `eslint .` (works) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) |
| `eslint.config.mjs` | ✓ | ✓ | ✓ | ✗ | ✗ (legacy `.eslintrc.json`) | ✗ | ✗ |
| Schema timestamp mode | raw integer (unix s) | raw integer (unix s) | `{ mode: 'timestamp' }` (Date) | raw integer (unix s) | `{ mode: 'number' }` (typed number) | raw integer (unix s) | raw integer (unix s) |
| Schema boolean mode | raw 0/1 + `toBool`/`fromBool` helpers | raw 0/1 integer | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | raw 0/1 integer | raw 0/1 integer |
| JWT callback refreshes live fields from DB | **✓** every request | ✗ login-only | ✗ login-only | ✗ login-only | ✗ login-only | ✗ login-only | ✗ login-only (broken) |
| `withAuth` rejects deactivated accounts | **✓** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `calculateSalesTaxFromPrice` formula | spec: `price - price/(1+rate)` | same | same | same | same | **differs: `price * rate`** (adds tax, not extracts) | same |
| NextAuth module augmentation | `next-auth` + `@auth/core/jwt` | `next-auth` + `@auth/core/jwt` | `next-auth` only | `next-auth` only | `next-auth` only (incomplete — `iat`/`pca` untyped) | `next-auth` + `@auth/core/jwt` | none (uses `as any`) |
| Extra dependency | — | — | `uuid@^14` + `@types/uuid` | — | — | — | — |
| zod version | v4 | v4 | **v3** | v4 | v4 | v4 | v4 |
| Extra API endpoint | — | — | — | `+ /api/sales/export` | — | — | — |
| Missing API endpoints | — | — | — | — | — | — | `− /mileage/export`, `− /mileage/reports` |
| Migration `meta/` journal | ✓ | ✗ missing | ✓ | ✓ | ✓ | ✓ | ✓ |
| bcrypt cost (app code) | 10 (centralized in `config.ts`) | **12** (inconsistent w/ seed) | 10 | 10 | 10 | 10 | 10 |
| SameSite cookie config | **explicit `strict`** | default | default | **explicit `strict`** | **explicit `strict`** | default | default |
| `serverExternalPackages` in next.config | yes | no | yes | no | no | no | no |
| Caddyfile rate-limit scoping | scoped via `handle /api/auth/*` | global zones | scoped via `handle_path /api/auth/*` | global zones | global zones | global zones | global zones |
| Extra modules (beyond spec list) | `api-client`, `inventory-logic`, `app-shell`, `client-shell` | 0 | 0 | `http-utils`, `inventory-queries`, `sales-queries`, `rbac` | 0 | 0 | 0 |
| Seed admin email | admin@example.com | admin@resalemanager.com | security@lawsonsoft.com | admin@example.com (via /api/setup) | security@lawsonsoft.com | admin@example.com (via /api/setup) | admin@example.com |

Notable interpretation differences:
- **JWT refresh strategy:** claude-5.2 is the only branch that refreshes `passwordChangedAt`/`role`/`canViewAll`/`isActive` from the DB on every request inside the `jwt` callback. The other six copy these fields only at login, meaning role/canViewAll changes don't propagate to existing JWTs until the token expires or the password is reset. pi-5.2 is in this login-only group but, unlike pi-5.1, at least writes `passwordChangedAt` at login so the AUTH-02 minimum is met.
- **`calculateSalesTaxFromPrice` formula:** vscode-5.2 is the only branch that deviates from the spec formula. The spec requires `taxAmount = price - (price / (1 + rate))` (extract tax from a tax-inclusive price), but vscode-5.2 implements `price * rate` (compute tax to add to a tax-exclusive price). These produce different results: for price=100 and rate=0.0825, the spec formula yields 7.62, while vscode-5.2 yields 8.25. Its test passes because it asserts the implementation's output, not the spec's expected value. pi-5.2 uses the spec formula correctly.
- **Timestamp/boolean schema modes:** opencode-5.1 uses `{ mode: 'timestamp' }` (Date); opencode-5.2 and pi-5.2 use `{ mode: 'boolean' }` / `{ mode: 'number' }`, which makes the inferred TS types `boolean`/`number` instead of raw integers. This is more ergonomic and avoids the `toBool`/`fromBool` conversion boilerplate. Claude-5.2, claude-5.1, pi-5.1, and vscode-5.2 store raw unix integers and avoid the conversion; claude-5.2 additionally ships `toBool`/`fromBool` helpers.
- **`withAuth` signature:** pi-5.1's signature (`withAuth(req, handler)`) is the largest API-shape deviation. pi-5.2 and opencode-5.2 use the `async function POST(req){ return withAuth(...) }` form (functionally equivalent, deviates from canonical). vscode-5.2 and both Claude branches use the canonical `export const POST = withAuth(...)` form.
- **`validateOriginOrReferer` exemptions:** pi-5.2 regressed vs pi-5.1 — pi-5.1 exempted both `/api/auth/*` and `/api/setup`, but pi-5.2 exempts neither. This is shared with opencode-5.2 and vscode-5.2. Only claude-5.2 (both paths) and pi-5.1 (both paths) fully comply; claude-5.1 partially complies (`/api/auth/*` only).
- **bcrypt cost:** claude-5.2 centralizes cost 10 in `config.ts` via a `hashPassword()` helper — the cleanest approach. claude-5.1 uses cost 12 in app code but 10 in seed (inconsistent). The others (including pi-5.2 and vscode-5.2) hardcode 10 at each call site.
- **Seed admin email:** pi-5.2 (like opencode-5.1) seeds `security@lawsonsoft.com`, not `admin@example.com`. This matters for functional E2E: the canonical specs assume `admin@example.com`, so the pi-5.2 worktree's seed must be read to get the correct admin credentials. pi-5.2's seed creates only the admin user (no regular `user@example.com`), so functional tests that need a standard user must create one via the admin API.

---

## 8. Findings by Severity

| Sev | Branch | Finding | Location |
|---|---|---|---|
| **High** | `build-pi-glm-5.1` | `passwordChangedAt` never written to JWT → session invalidation always no-ops (AUTH-02/SEC-03 broken) | `src/lib/auth.ts:90-97` |
| **High** | `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-pi-glm-5.1`, `build-vscode-glm-5.2` | `lint` script uses removed `next lint`; no `eslint.config.mjs`; lint pipeline non-functional | `package.json` scripts |
| **Med** | `build-vscode-glm-5.2` | `calculateSalesTaxFromPrice` uses `price * rate` instead of spec's `price - price/(1+rate)` (SALE-04 deviation) | `src/lib/financial.ts:48` |
| **Med** | `build-opencode-glm-5.1`, `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-vscode-glm-5.2` | `validateOriginOrReferer` does not exempt `/api/auth/*` (AUTH-04 deviation) | `src/lib/api-utils.ts` / `http-utils.ts` |
| **Med** | `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-pi-glm-5.1`, `build-vscode-glm-5.2` | No explicit `SameSite=Strict` on session cookie (relies on NextAuth default `lax`) | `src/lib/auth.ts` |
| **Med** | `build-pi-glm-5.1` | Missing `/api/mileage/export` and `/api/mileage/reports` endpoints (MILE-02, MILE-03) | `src/app/api/mileage/` |
| **Med** | claude-5.1, opencode-5.1, opencode-5.2, pi-5.2, pi-5.1, vscode-5.2 | No integration tests produced (spec requires 9 under `tests/integration/api/`) | `tests/integration/` absent |
| **Med** | `build-pi-glm-5.2`, `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-opencode-glm-5.2`, `build-pi-glm-5.1`, `build-vscode-glm-5.2` | JWT refresh is login-only — `passwordChangedAt`/`role`/`canViewAll`/`isActive` not refreshed from DB on every request (AUTH-02 minimum met, but REG-06 functional scenario fails) | `src/lib/auth.ts` jwt callback |
| **Med** | `build-vscode-glm-5.2` | Only 2 of 7 required functional tests (missing `password-invalidation`, `setup-lock`, `sale-refund-flow`, `inventory-removal-date`, `refund-impact`) | `tests/functional/` |
| **Low** | `build-opencode-glm-5.1`, `build-pi-glm-5.1` | Middleware named `src/middleware.ts` not `src/proxy.ts` (BUILD_PROMPT STEP 6) | `src/` |
| **Low** | `build-claude-glm-5.1` | Migration directory lacks `meta/_journal.json` (only `.sql`); may break `drizzle-kit migrate` | `drizzle/` |
| **Low** | `build-claude-glm-5.1` | bcrypt cost 12 in app code, 10 in seed (inconsistent; both ≥ spec) | `src/app/api/*/route.ts`, `src/scripts/seed.ts` |
| **Low** | `build-opencode-glm-5.1` | zod v3 pinned while spec ecosystem is v4; 97 type-escape occurrences in `src/` | `package.json`, `src/lib/auth.ts` |
| **Low** | `build-opencode-glm-5.1` | Adds `uuid@^14` dependency not used by core id flow | `package.json` |
| **Low** | `build-pi-glm-5.2` | 50 type-escape occurrences in `src/` (29 `as any` + 17 `: any` + 4 `<any>`); NextAuth module augmentation incomplete (`iat`/`passwordChangedAt` untyped on session, accessed via `as any`) | `src/lib/api-utils.ts`, `src/lib/auth-utils.ts`, `src/app/*/page.tsx`, `src/lib/backup.ts` |
| **Low** | `build-vscode-glm-5.2` | Only 1 of 5 required e2e specs (auth only; missing inventory, sales, rbac, import) | `tests/e2e/` |
| **Low** | `build-vscode-glm-5.2` | Schema imports `check` from drizzle-orm but never uses it (dead import) | `src/lib/schema.ts:1` |
| **Info** | `build-claude-glm-5.2` | Extra modules `api-client`, `inventory-logic`, `app-shell`, `client-shell` (well-scoped refinements, spec-list deviation) | `src/lib/`, `src/components/` |
| **Info** | `build-opencode-glm-5.2` | Extra modules `http-utils`, `inventory-queries`, `sales-queries`, `rbac` (cleaner separation, spec-list deviation) | `src/lib/` |
| **Info** | `build-pi-glm-5.1` | 13 `console.log` in `src/` (highest density) | various |
| **Info** | `build-vscode-glm-5.2` | 1 `as any` in `db.ts` Proxy pattern (pragmatic escape for dynamic property forwarding) | `src/lib/db.ts:43` |

---

## 9. Appendix A — Methodology

1. **Worktrees.** Each branch was checked out into an isolated git worktree under `/tmp/opencode/eval/<branch>` so all could be inspected and built without checkout churn. The `main` branch remained checked out in the primary workspace for writing this report.
2. **Static analysis.** File censuses used `find` + `wc`. Type-escape and dangerous-pattern counts used `grep -rn` over `src/` (tests excluded unless noted). Module/endpoint presence used `find` and `git ls-tree`. Critical modules (`schema.ts`, `financial.ts`, `api-utils.ts`, `auth.ts`, `validations.ts`, `reports/route.ts`, `inventory/[id]/route.ts`, `inventory/bulk/route.ts`, `sales/route.ts`, `admin/users/[id]/route.ts`, `next.config.ts`, `Caddyfile`, `Dockerfile`, `proxy.ts`/`middleware.ts`) were read in full.
3. **Dynamic verification.** Per worktree: `npm ci --no-audit --no-fund`, then `npm run lint` (or `next lint` where scripted), then `npx tsc --noEmit`, then `npm test` (`vitest run`). All seven installed cleanly under Node 24.15 / npm 11.12. E2E (`playwright test`) was not run: only the two Claude branches and vscode-5.2 ship e2e specs, and running Playwright was deemed informational per the approved plan; unit/functional/integration results are weighted instead.
4. **No patching.** Per the approved plan, branches were not modified to repair failures — a broken lint script or missing endpoint was recorded as-is to preserve "single one-shot prompt" fidelity.
5. **No commits to build branches.** This report is the only file written to the repo on `main`; nothing was committed to any build branch. Worktrees and logs under `/tmp/opencode/eval/` are throwaway.
6. **`build-ibm-bob` excluded.** An eighth branch (`build-ibm-bob`) was attempted but did not complete — the agent exhausted its usage quota on the lowest Pro plan mid-build. Since a partial build cannot be fairly compared against completed builds, it is excluded from all evaluation sections. The branch remains in the repository for reference.
7. **Relative star ratings.** Stars are relative to the current cohort, not absolute: 5★ = current best in the cohort per dimension. When a new branch is added, the whole cohort is re-ranked and stars rescaled so the leader = 5★. See the re-evaluation log below for rank deltas from this update.

### Raw verification results

| Branch | `npm ci` | `npm run lint` | `tsc --noEmit` | `vitest run` |
|---|---|---|---|---|
| `build-claude-glm-5.2` | exit 0 | **exit 0 — 0 err / 0 warn** | exit 0 (clean) | exit 0 — **23 files, 186 tests** |
| `build-claude-glm-5.1` | exit 0 | exit 1 — 11 err / 81 warn | exit 0 (clean) | exit 0 — 14 files, 121 tests |
| `build-opencode-glm-5.1` | exit 0 | exit 1 — 119 err / 72 warn | exit 0 (clean) | exit 0 — 14 files, 115 tests |
| `build-opencode-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 12 files, 134 tests |
| `build-pi-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16; legacy `.eslintrc.json` unreadable by ESLint v9 | exit 0 (clean) | exit 0 — 14 files, 137 tests |
| `build-pi-glm-5.1` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 9 files, 95 tests |
| `build-vscode-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 9 files, 100 tests |

### Endpoint inventory (per branch)

All seven expose the core 22 endpoints (`/api/health`, `/api/auth/[...nextauth]`, `/api/setup`, `/api/inventory*`, `/api/sales`, `/api/sales/[id]`, `/api/mileage`, `/api/mileage/[id]`, `/api/photos/[itemId]/[filename]`, `/api/profile`, `/api/reports`, `/api/import`, `/api/settings`, `/api/admin/{users,backup,setup-unlock}`). Variances:
- `build-opencode-glm-5.2` adds `/api/sales/export` (not required, harmless).
- `build-pi-glm-5.1` omits `/api/mileage/export` and `/api/mileage/reports` (required by MILE-02/MILE-03).
- `build-claude-glm-5.2`, `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-pi-glm-5.2`, and `build-vscode-glm-5.2` match the spec surface exactly.

### Test files present (per branch)

```
build-claude-glm-5.2:        7 unit + 7 functional + 9 integration + 5 e2e + 3 setup + 3 helpers  (34 files)
build-claude-glm-5.1:        7 unit + 7 functional              + 5 e2e + 3 setup            (22 files)
build-opencode-glm-5.1:     7 unit + 7 functional                    + 2 setup            (16 files)
build-opencode-glm-5.2:     7 unit + 5 functional                    + 2 setup            (14 files)
build-pi-glm-5.2:            7 unit + 7 functional                    + 2 setup            (16 files)
build-pi-glm-5.1:            6 unit + 3 functional                    + 2 setup            (11 files)
build-vscode-glm-5.2:        7 unit + 2 functional              + 1 e2e + 3 setup            (13 files)
```
Integration tests (`tests/integration/`): **9 files in `build-claude-glm-5.2` only; 0 in all other branches.**

---

## 10. Bottom Line

- **Best overall build:** **`build-claude-glm-5.2`**. It is the most spec-faithful, the most type-disciplined, the only branch with a complete 4-tier test suite (incl. the 9 required integration tests), the only branch whose lint passes with zero errors/warnings, and the most security-hardened (explicit SameSite=Strict + live JWT refresh + `isActive` enforcement). It has no high- or medium-severity findings. Adopt it as the production baseline.
- **Runner-up:** `build-claude-glm-5.1` — same canonical patterns and type discipline, but no integration tests, missing `drizzle/meta/`, lint emits 11 errors, and no explicit SameSite cookie. Port the SameSite config and `drizzle/meta/` from claude-5.2 if you stay on 5.1.
- **Most security-hardened alternative:** `build-opencode-glm-5.2` — also has explicit SameSite and clean typing, but its lint pipeline is broken (`next lint` removed in Next 16, no `eslint.config.mjs`), it lacks the live JWT refresh and `isActive` gate, and it deviates from the canonical `withAuth` signature.
- **`build-pi-glm-5.2`** is the most-improved build in the cohort: it fixes all three of pi-5.1's critical defects (session-invalidation bug, middleware naming, missing mileage endpoints), adds explicit SameSite, and ships the most tests of any non-Claude branch (137, incl. the full 7 unit + 7 functional spec set). It ranks #4. Its remaining gaps are: zero integration tests, zero e2e specs, broken lint pipeline (`next lint` removed, legacy `.eslintrc.json`), 50 type-escape occurrences, no `/api/auth/*` Origin exemption (regression vs pi-5.1), and login-only JWT refresh (so REG-06 will fail functionally). If adopted, fix the lint pipeline (add `eslint.config.mjs`), add the `/api/auth/*` exemption, complete the NextAuth module augmentation to remove `as any` on session fields, add the 9 integration tests, and implement live JWT refresh.
- **`build-vscode-glm-5.2`** is a compact, type-safe build (1 `as any`, 0 `: any`) with all 24 endpoints, correct `src/proxy.ts`, and full ops artifacts. It now ranks #5 (pushed down by pi-5.2). Its main gaps are: thinnest test suite of completed builds (9 files / 100 tests, only 2 functional + 1 e2e, no integration), broken lint script (`next lint`), `calculateSalesTaxFromPrice` formula deviation from spec, and no explicit SameSite cookie. If adopted, fix the tax formula, add the missing functional/integration/e2e tests, and port SameSite config from claude-5.2.
- **Avoid `build-pi-glm-5.1` as a production baseline:** its session-invalidation bug is silent and security-critical, and it is missing two required mileage endpoints. (These are all fixed in pi-5.2.)
- **`build-opencode-glm-5.1`** is compact and works, but its 97 type escapes and zod v3 pin make it the worst-positioned for future maintenance despite the small footprint.
- **`build-ibm-bob`** was not completed (agent ran out of quota on the lowest Pro plan) and is therefore excluded from the comparison. A fair evaluation would require re-running the build with sufficient quota.

The prior cohort's single biggest shared gap — the **complete absence of integration tests** — is closed by `build-claude-glm-5.2` (9 integration test files, 60+ integration test cases, all passing). The other six branches still have zero integration tests.

---

## 11. Re-evaluation Log

| Date | Branch added | Static analysis | Functional re-run triggered? | Rank deltas |
|---|---|---|---|---|
| 2026-07-06 | `build-pi-glm-5.2` (pi 0.79.2 / GLM 5.2) | Run on pi-5.2 only; existing 6 branches not re-analyzed | No — pi-5.2 functional score expected ≤ claude-5.2's 100/100 ceiling; per the strict-`>` re-run rule, no existing branches were re-evaluated | `build-vscode-glm-5.2` 4→5, `build-opencode-glm-5.1` 5→6, `build-pi-glm-5.1` 6→7; pi-5.2 enters at #4 |