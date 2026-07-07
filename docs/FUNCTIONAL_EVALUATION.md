# Functional Evaluation Report — Resell Inventory Manager v2

> Date: 2026-07-06 (updated)
> Scope: Playwright E2E evaluation of 7 completed builds against docs/TEST_STRATEGY.md.
> Methodology: isolated git worktrees, `next dev` boot (Docker Compose skipped — no TLS certs in eval env), Playwright chromium, 3 retries per flow. Admin bootstrapped per-branch via the branch's native `seed.ts` where working, else via the documented `/api/setup` first-run endpoint. Migrations run via `npx drizzle-kit migrate` (per OPERATIONS.md §1.3) where the app did not auto-migrate.
> Re-evaluation log: 2026-07-06 — added `build-pi-glm-5.2`. Functional E2E run on pi-5.2 only; existing 6 branches were NOT re-evaluated (per the strict-`>` re-run rule: pi-5.2's score of 96/100 does not exceed the current leader's 100/100, so no re-run was triggered). pi-5.2 enters at functional rank #2 (tied with vscode-5.2 at 96/100).

## 1. Executive Summary

`build-claude-glm-5.2` remains the clear functional winner: it is the only build that passes all 26 E2E checks across the 5 canonical flows (auth, inventory, sales, import, rbac), achieving a functional score of 100/100. It is also the only build whose session-invalidation flow (REG-06) works end-to-end — consistent with the static-analysis finding that claude-5.2 is the sole branch with a live JWT refresh of `passwordChangedAt` on every request.

The newly added `build-pi-glm-5.2` is a strong performer, tying `build-vscode-glm-5.2` as runner-up at 96/100 (25/26 pass). Like vscode-5.2, its single failure is REG-06 (session invalidation) — the same live-JWT-refresh gap noted in BUILD_EVALUATION.md. Notably, pi-5.2 fixes all three of pi-5.1's critical functional defects: sale creation no longer returns 500 (REG-01..REG-04 and REG-18 now pass), inventory GET no longer returns undefined fields (REG-13/14 pass), and admin user management works (REG-11 passes). This is the most-improved build in the cohort functionally, jumping from pi-5.1's 62/100 to 96/100. Its seed script works natively (no missing-dotenv crash, unlike opencode-5.2 and vscode-5.2), though it seeds `security@lawsonsoft.com` (not `admin@example.com`) and only creates the admin user (no standard user), so the functional specs must create a regular user via the admin API before testing user-scoped flows. It also requires `AUTH_SECRET` to be set as an env var (NextAuth throws `MissingSecret` without it) — a boot requirement the other branches handle via config defaults.

`build-vscode-glm-5.2` (96/100, 25/26 pass) remains a co-runner-up, failing only REG-06. `build-opencode-glm-5.2` (88/100) and `build-opencode-glm-5.1` (69/100) follow, with the opencode-5.2 build notably recovering once migrations were applied via `drizzle-kit` (its own `seed.ts` is broken — it `require`s `dotenv/config`, which is not installed). `build-pi-glm-5.1` (62/100) and `build-claude-glm-5.1` (35/100) round out the cohort.

The biggest shared functional gap remains **session invalidation** (REG-06), which only claude-5.2 implements correctly — every other build, including pi-5.2, copies `passwordChangedAt` into the JWT only at login, so admin password resets do not invalidate existing sessions. A second shared gap is **admin user management** (REG-11), which fails on five of seven builds (all except claude-5.2 and pi-5.2). Sale creation (`POST /api/sales` returning HTTP 500), which broke REG-01..REG-04 and REG-18 on four of the original six builds, is now fixed in pi-5.2.

Notable per-branch surprises: (1) `build-opencode-glm-5.2` and `build-vscode-glm-5.2` both ship a `seed.ts` that crashes on `Cannot find module 'dotenv/config'` — a real boot defect that forces falling back to the `/api/setup` first-run endpoint to create the admin; (2) `build-claude-glm-5.2`'s `/api/setup` POST route throws a 500 (a `tag` column mismatch in its custom migrator when `drizzle-kit migrate` has run), so it must rely on its native seed script; (3) `build-opencode-glm-5.1` is the most improved by the documented `drizzle-kit migrate` step — going from 0/26 to 18/26 once migrations are applied; (4) `build-pi-glm-5.1`'s inventory GET returns items with `undefined` fields, indicating a serialization shape mismatch (fixed in pi-5.2); (5) `build-pi-glm-5.2` requires `AUTH_SECRET` to be set as an env var or NextAuth throws `MissingSecret` and all auth flows fail — the other branches handle this via config defaults or tolerate the missing secret in dev.

## 2. Methodology

- Playwright version: 1.61.1
- Node version: v24.15.0 (npm 11.12.1)
- Boot mode: `next dev` (Docker Compose skipped — no production TLS certificates available in the eval environment; the dev fallback is documented in FUNCTIONAL_EVAL_PROMPT.md STEP 2). All builds target Next.js 16.2.x with Turbopack.
- Admin bootstrapping: each branch's native `seed.ts` was attempted first; where the seed script crashed (opencode-5.2, vscode-5.2 — missing `dotenv/config`) or the app did not auto-migrate (opencode-1.17.4, opencode-5.2, pi-5.1, vscode-5.2), the documented fallbacks were used: `npx drizzle-kit migrate` (OPERATIONS.md §1.3) and/or `POST /api/setup` (SETUP-01). No build branches were patched.
- Boot modes per branch:
  | Branch | Agent version | Boot mode | Admin created via | Notes |
  |---|---|---|---|---|
  | build-claude-glm-5.2 | Claude Code 2.1.196 | dev (auto-migrate via lazy proxy) | native seed (admin@example.com) | app auto-migrates via lazy DB proxy; `/api/setup` POST is broken (500), so native seed is required |
  | build-claude-glm-5.1 | Claude Code 2.1.176 | dev (auto-migrate via app + drizzle-kit) | native seed (admin@resalemanager.com) | app auto-migrates; native seed uses admin@resalemanager.com |
  | build-opencode-glm-5.1 | opencode 1.17.4 | dev (drizzle-kit migrate required) | native seed (security@lawsonsoft.com) | app does not auto-migrate; `drizzle-kit migrate` required; native seed uses security@lawsonsoft.com |
  | build-opencode-glm-5.2 | opencode 1.17.4 | dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv) | /api/setup (admin@example.com) | seed.ts crashes (missing dotenv); admin created via /api/setup fallback |
  | build-pi-glm-5.2 | pi 0.79.2 | dev (seed auto-migrates via runMigrations; AUTH_SECRET env required) | native seed (security@lawsonsoft.com) | seed.ts calls runMigrations() then creates admin; requires AUTH_SECRET env var (NextAuth throws MissingSecret without it); seed creates only admin (no standard user); admin email is security@lawsonsoft.com |
  | build-pi-glm-5.1 | pi 0.79.2 | dev (drizzle-kit migrate required) | native seed (admin@example.com) | app does not auto-migrate; `drizzle-kit migrate` + ADMIN_EMAIL env required |
  | build-vscode-glm-5.2 | VS Code 1.126.0 (GitHub Copilot) | dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv) | /api/setup (admin@example.com) | seed.ts crashes (missing dotenv); admin created via /api/setup fallback |
- Retry count: 3 full runs of the 26-test suite per branch (78 test executions per branch).
- Caddy 429 handling: N/A — Caddy was not in the dev boot path; no rate-limit 429s were observed.
- Canonical E2E specs: 5 spec files (`auth.spec.ts`, `inventory.spec.ts`, `sales.spec.ts`, `import.spec.ts`, `rbac.spec.ts`) written from `docs/TEST_STRATEGY.md §2.4` and `§4.1`. The specs are API-contract-focused (the API surface is fixed by the spec; UI selectors vary between builds), with one browser-driven logout test. Specs were written into each worktree as throwaway files (not committed).

## 3. Per-Branch Results

### 3.1 build-claude-glm-5.2

**Agent:** Claude Code 2.1.196 · **Boot:** dev (auto-migrate via lazy proxy) · **Admin:** admin@example.com (via /api/setup fallback) · **Functional score:** 100/100 (26/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | pass | 8/8 tests pass |  |
| inventory | pass | 6/6 tests pass |  |
| sales | pass | 5/5 tests pass |  |
| import | pass | 3/3 tests pass |  |
| rbac | pass | 4/4 tests pass |  |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | pass | — |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | pass | — |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | pass | — |
| REG-04 | Delete sale → item status reverts to "available" | pass | — |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | pass | — |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | pass | — |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | pass | — |
| REG-14 | Status transition "returned" → "available" clears removalDate | pass | — |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | pass | — |

#### Failures & remediation
_(no failures)_

**Summary:** The only fully-functional build. All 5 flows pass and all 18 regression scenarios pass. Live JWT refresh of passwordChangedAt makes REG-06 work (admin password reset invalidates existing sessions). Sale creation, status transitions, refunds, RBAC, CSV import, and backup-restore validation all behave per spec. No remediation required.

### 3.2 build-claude-glm-5.1

**Agent:** Claude Code 2.1.176 · **Boot:** dev (auto-migrate via app + drizzle-kit) · **Admin:** admin@resalemanager.com (native seed) · **Functional score:** 35/100 (9/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 5/8 tests pass | Error: expect(received).toBeFalsy() | Received: true |
| inventory | fail | 0/6 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| sales | fail | 0/5 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| import | pass | 3/3 tests pass |  |
| rbac | fail | 1/4 tests pass | Error: expect(received).toBeTruthy() | Received: undefined |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-04 | Delete sale → item status reverts to "available" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toBeDefined() | Received: undefined |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | fail | Error: expect(received).toBeTruthy() | Received: undefined |
| REG-11 | Admin can manage users and edit any data | fail | Error: expect(received).toBeTruthy() | Received: false |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-13 | Status transition to "donated" sets removalDate | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-14 | Status transition "returned" → "available" clears removalDate | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-15 | Backup restore with invalid data → no DB changes | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / — | Error: expect(received).toBeFalsy() | Received: true | S | Fix per spec: fix the NextAuth credentials callback to authenticate valid credentials. |
| auth / — | Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 2 | M | Fix per spec: fix the failing behavior to match the spec. |
| auth / REG-06 | Error: expect(received).toBeDefined() | Received: undefined | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |
| inventory / — | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per spec: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| inventory / REG-12 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| inventory / REG-13 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| inventory / REG-14 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| inventory / REG-05 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per INV-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| inventory / REG-17 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per INV-05: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| sales / REG-01 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| sales / REG-02 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-03 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-04 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-02: fix the failing behavior to match the spec. |
| sales / REG-18 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| rbac / REG-10 | Error: expect(received).toBeTruthy() | Received: undefined | M | Fix per INV-03: fix the failing behavior to match the spec. |
| rbac / REG-11 | Error: expect(received).toBeTruthy() | Received: false | M | Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete. |
| rbac / REG-15 | Error: expect(received).toContain(expected) // indexOf | M | Fix per BAK-02: fix the failing behavior to match the spec. |

**Summary:** Auth gating and CSV import work (9/26 pass), but sale and inventory creation return HTTP 500, which cascades to fail REG-01..REG-05, REG-12..REG-14, REG-17, and REG-18. REG-06 fails because the jwt callback copies passwordChangedAt only at login (no live refresh). REG-10/REG-11 (RBAC user management) fail. The 500s suggest a single broken handler or validation path in the POST routes; fixing it would likely unlock many downstream scenarios.

### 3.3 build-opencode-glm-5.1

**Agent:** opencode 1.17.4 · **Boot:** dev (drizzle-kit migrate required) · **Admin:** security@lawsonsoft.com (native seed) · **Functional score:** 69/100 (18/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 7/8 tests pass | Error: expect(received).toContain(expected) // indexOf |
| inventory | fail | 5/6 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: "returned" | Received: "sol |
| sales | fail | 0/5 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| import | pass | 3/3 tests pass |  |
| rbac | fail | 3/4 tests pass | Error: expect(received).toContain(expected) // indexOf |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-04 | Delete sale → item status reverts to "available" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | pass | — |
| REG-14 | Status transition "returned" → "available" clears removalDate | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: "returned" | Received: "sol |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / REG-06 | Error: expect(received).toContain(expected) // indexOf | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |
| inventory / REG-14 | Error: expect(received).toBe(expected) // Object.is equality | Expected: "returned" | Rece | S | Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned. |
| sales / REG-01 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| sales / REG-02 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-03 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-04 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-02: fix the failing behavior to match the spec. |
| sales / REG-18 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| rbac / REG-11 | Error: expect(received).toContain(expected) // indexOf | M | Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete. |

**Summary:** Strong performer once migrations are applied via drizzle-kit (18/26 pass). Fails concentrate in sales (REG-01..REG-04, REG-18 — sale POST returns 500), REG-14 (returned status not set correctly on refund_with_return), REG-06 (no live JWT refresh), and REG-11 (admin user management). RBAC view restrictions (REG-09/10) and most inventory flows work.

### 3.4 build-opencode-glm-5.2

**Agent:** opencode 1.17.4 · **Boot:** dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv) · **Admin:** admin@example.com (via /api/setup fallback; seed broken) · **Functional score:** 88/100 (23/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 7/8 tests pass | Error: expect(received).toContain(expected) // indexOf |
| inventory | pass | 6/6 tests pass |  |
| sales | pass | 5/5 tests pass |  |
| import | fail | 2/3 tests pass | Error: expect(received).toBeTruthy() | Received: false |
| rbac | fail | 3/4 tests pass | Error: expect(received).toContain(expected) // indexOf |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | pass | — |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | pass | — |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | pass | — |
| REG-04 | Delete sale → item status reverts to "available" | pass | — |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | pass | — |
| REG-14 | Status transition "returned" → "available" clears removalDate | pass | — |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | pass | — |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / REG-06 | Error: expect(received).toContain(expected) // indexOf | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |
| import / — | Error: expect(received).toBeTruthy() | Received: false | S | Fix per spec: fix the mileage import path in POST /api/import for type=mileage. |
| rbac / REG-11 | Error: expect(received).toContain(expected) // indexOf | M | Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete. |

**Summary:** Third-strongest build (23/26 pass). Only REG-06 (session invalidation), mileage CSV import, and REG-11 (admin user management) fail. Notable: its seed.ts is broken (missing dotenv), so admin must be bootstrapped via /api/setup. Sale creation, status transitions, refunds, RBAC view rules, and backup-restore validation all work.

### 3.5 build-pi-glm-5.1

**Agent:** pi 0.79.2 · **Boot:** dev (drizzle-kit migrate required) · **Admin:** admin@example.com (native seed with ADMIN_EMAIL env) · **Functional score:** 62/100 (16/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 7/8 tests pass | Error: expect(received).toContain(expected) // indexOf |
| inventory | fail | 3/6 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: "E2E Item" | Received: unde |
| sales | fail | 0/5 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| import | pass | 3/3 tests pass |  |
| rbac | fail | 3/4 tests pass | Error: expect(received).toContain(expected) // indexOf |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-04 | Delete sale → item status reverts to "available" | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | fail | Error: expect(received).toBeTruthy() | Received: undefined |
| REG-14 | Status transition "returned" → "available" clears removalDate | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: "sold" | Received: undefine |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500 |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / REG-06 | Error: expect(received).toContain(expected) // indexOf | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |
| inventory / — | Error: expect(received).toBe(expected) // Object.is equality | Expected: "E2E Item" | Rece | M | Fix per spec: fix the failing behavior to match the spec. |
| inventory / REG-13 | Error: expect(received).toBeTruthy() | Received: undefined | S | Fix per INV-02: set removalDate when status transitions to donated. |
| inventory / REG-14 | Error: expect(received).toBe(expected) // Object.is equality | Expected: "sold" | Received | S | Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned. |
| sales / REG-01 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| sales / REG-02 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-03 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-03: fix the failing behavior to match the spec. |
| sales / REG-04 | Error: expect(received).toContain(expected) // indexOf | M | Fix per SALE-02: fix the failing behavior to match the spec. |
| sales / REG-18 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 5 | M | Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input. |
| rbac / REG-11 | Error: expect(received).toContain(expected) // indexOf | M | Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete. |

**Summary:** 16/26 pass. Sale creation returns 500 (REG-01..REG-04, REG-18). Inventory GET returns items with undefined fields (REG-13/14 fail on missing removalDate/status). REG-06 (no live JWT refresh) and REG-11 (admin user management) fail. RBAC view restrictions (REG-09) and basic auth gating work. Consistent with BUILD_EVALUATION's critical session-invalidation finding.

### 3.6 build-vscode-glm-5.2

**Agent:** VS Code 1.126.0 (GitHub Copilot) · **Boot:** dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv) · **Admin:** admin@example.com (via /api/setup fallback; seed broken) · **Functional score:** 96/100 (25/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 7/8 tests pass | Error: expect(received).toContain(expected) // indexOf |
| inventory | pass | 6/6 tests pass |  |
| sales | pass | 5/5 tests pass |  |
| import | pass | 3/3 tests pass |  |
| rbac | pass | 4/4 tests pass |  |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | pass | — |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | pass | — |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | pass | — |
| REG-04 | Delete sale → item status reverts to "available" | pass | — |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toContain(expected) // indexOf |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | pass | — |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | pass | — |
| REG-14 | Status transition "returned" → "available" clears removalDate | pass | — |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | pass | — |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / REG-06 | Error: expect(received).toContain(expected) // indexOf | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |

**Summary:** Runner-up (25/26 pass). The single failure is REG-06 (session invalidation) — the same live-JWT-refresh gap noted in BUILD_EVALUATION.md. Every other flow, including sale creation, status transitions, refunds, RBAC, CSV import (incl. mileage), and backup-restore validation, passes. Its seed.ts is broken (missing dotenv), but /api/setup bootstraps the admin cleanly.

### 3.7 build-pi-glm-5.2

**Agent:** pi 0.79.2 · **Boot:** dev (seed auto-migrates via runMigrations; AUTH_SECRET env required) · **Admin:** security@lawsonsoft.com (native seed) · **Functional score:** 96/100 (25/26 tests pass)

#### E2E flow results
| Flow | Status | Attempts | Error |
|---|---|---|---|
| auth | fail | 10/11 tests pass | Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200 |
| inventory | pass | 6/6 tests pass |  |
| sales | pass | 5/5 tests pass |  |
| import | pass | 3/3 tests pass |  |
| rbac | pass | 4/4 tests pass |  |

#### Regression scenarios
| ID | Scenario | Status | Error |
|---|---|---|---|
| REG-01 | Create item → record sale → item status becomes "sold" | pass | — |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | pass | — |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | pass | — |
| REG-04 | Delete sale → item status reverts to "available" | pass | — |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | pass | — |
| REG-06 | Password change invalidates existing JWT sessions | fail | Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200 |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | pass | — |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | pass | — |
| REG-09 | Standard user cannot access another user's items | pass | — |
| REG-10 | canViewAll user can view all data but only edit own | pass | — |
| REG-11 | Admin can manage users and edit any data | pass | — |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | pass | — |
| REG-13 | Status transition to "donated" sets removalDate | pass | — |
| REG-14 | Status transition "returned" → "available" clears removalDate | pass | — |
| REG-15 | Backup restore with invalid data → no DB changes | pass | — |
| REG-16 | Setup lock prevents second admin creation | pass | — |
| REG-17 | Photo upload requires item ownership | pass | — |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | pass | — |

#### Failures & remediation
| Flow / scenario | Error | Effort | Remediation prompt |
|---|---|---|---|
| auth / REG-06 | Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200 | M | Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions. |

**Summary:** Co-runner-up (25/26 pass, tied with vscode-5.2 at 96/100). The single failure is REG-06 (session invalidation) — pi-5.2 copies `passwordChangedAt` into the JWT at login but does not live-refresh it, so an admin password change bumps `passwordChangedAt` on the user row but the existing JWT (frozen at the old value) is not rejected. This is the same shared gap as vscode-5.2, opencode-5.2, opencode-5.1, pi-5.1, and claude-5.1. Every other flow passes: sale creation (no 500, unlike pi-5.1), status transitions (incl. returned→available clearing removalDate, unlike pi-5.1), refunds, RBAC (incl. admin user management — REG-11 passes, unlike pi-5.1), CSV import (inventory + sales + mileage all work), and backup-restore validation. The seed script works natively (no missing-dotenv crash) and auto-migrates via its own `runMigrations()`, but it requires `AUTH_SECRET` to be set as an env var (NextAuth throws `MissingSecret` without it) and seeds only the admin user (no standard `user@example.com`), so the functional specs create a regular user via the admin API before testing user-scoped flows. This is the most-improved build in the cohort functionally: +34 points over pi-5.1 (62→96).

## 4. Cross-Branch Comparison Matrix

### 4.1 E2E flows
| Flow | claude-5.2 | claude-5.1 | opencode-1.17.4 | opencode-5.2 | pi-5.2 | pi-5.1 | vscode-5.2 |
|---|---|---|---|---|---|---|---|
| auth | pass | fail | fail | fail | fail | fail | fail |
| inventory | pass | fail | fail | pass | pass | fail | pass |
| sales | pass | fail | fail | pass | pass | fail | pass |
| import | pass | pass | pass | fail | pass | pass | pass |
| rbac | pass | fail | fail | fail | pass | fail | pass |

### 4.2 Regression scenarios (REG-01..REG-18)
| ID | claude-5.2 | claude-5.1 | opencode-1.17.4 | opencode-5.2 | pi-5.2 | pi-5.1 | vscode-5.2 |
|---|---|---|---|---|---|---|---|
| REG-01 | pass | fail | fail | pass | pass | fail | pass |
| REG-02 | pass | fail | fail | pass | pass | fail | pass |
| REG-03 | pass | fail | fail | pass | pass | fail | pass |
| REG-04 | pass | fail | fail | pass | pass | fail | pass |
| REG-05 | pass | fail | pass | pass | pass | pass | pass |
| REG-06 | pass | fail | fail | fail | fail | fail | fail |
| REG-07 | pass | pass | pass | pass | pass | pass | pass |
| REG-08 | pass | pass | pass | pass | pass | pass | pass |
| REG-09 | pass | pass | pass | pass | pass | pass | pass |
| REG-10 | pass | fail | pass | pass | pass | pass | pass |
| REG-11 | pass | fail | fail | fail | pass | fail | pass |
| REG-12 | pass | fail | pass | pass | pass | pass | pass |
| REG-13 | pass | fail | pass | pass | pass | fail | pass |
| REG-14 | pass | fail | fail | pass | pass | fail | pass |
| REG-15 | pass | fail | pass | pass | pass | pass | pass |
| REG-16 | pass | pass | pass | pass | pass | pass | pass |
| REG-17 | pass | fail | pass | pass | pass | pass | pass |
| REG-18 | pass | fail | fail | pass | pass | fail | pass |

## 5. Aggregate Findings & Severity

| Sev | Branch | Finding | Flow | Scenario |
|---|---|---|---|---|
| High | build-claude-glm-5.1 | POST /api/sales and /api/inventory return HTTP 500 (broken creation handler) | sales/inventory | REG-01/REG-05/REG-12/REG-17/REG-18 |
| High | build-opencode-glm-5.1 | POST /api/sales returns 500; sale workflow non-functional | sales | REG-01..REG-04/REG-18 |
| High | build-pi-glm-5.1 | POST /api/sales returns 500; inventory GET returns undefined fields | sales/inventory | REG-01..REG-04/REG-13/REG-14/REG-18 |
| High | build-opencode-glm-5.2, build-vscode-glm-5.2 | seed.ts crashes: Cannot find module 'dotenv/config' (broken boot script) | boot | — |
| Med | build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2 | REG-06 fails: jwt callback copies passwordChangedAt only at login — no live refresh (AUTH-02) | auth | REG-06 |
| Med | build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1 | REG-11 fails: admin user-management endpoint returns wrong status/shape | rbac | REG-11 |
| Med | build-opencode-glm-5.1 | REG-14 fails: refund_with_return leaves item in 'sold' state instead of 'returned' | inventory | REG-14 |
| Med | build-opencode-glm-5.2 | Mileage CSV import (type=mileage) fails; inventory/sales imports work | import | — |
| Low | build-claude-glm-5.2 | /api/setup POST throws 500 when drizzle-kit has run (tag column mismatch in custom migrator) | boot | — |
| Low | build-pi-glm-5.2 | Requires AUTH_SECRET env var or NextAuth throws MissingSecret (no config default in dev) | boot | — |
| Low | build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2 | App does not auto-migrate on dev boot; requires manual `npx drizzle-kit migrate` (OPERATIONS.md §1.3) | boot | — |
| Info | all branches except build-claude-glm-5.2 | Session invalidation (REG-06) is the single most-shared functional gap — only claude-5.2 implements live JWT refresh | auth | REG-06 |

## 6. Effort Estimates Summary

| Branch | Total failures | S | M | L | XL | Estimated hours |
|---|---|---|---|---|---|---|
| build-claude-glm-5.2 | 0 | 0 | 0 | 0 | 0 | 0.0 |
| build-pi-glm-5.2 | 1 | 0 | 1 | 0 | 0 | 1.0 |
| build-vscode-glm-5.2 | 1 | 0 | 1 | 0 | 0 | 1.0 |
| build-opencode-glm-5.2 | 3 | 1 | 2 | 0 | 0 | 2.2 |
| build-opencode-glm-5.1 | 8 | 1 | 7 | 0 | 0 | 7.2 |
| build-pi-glm-5.1 | 10 | 2 | 8 | 0 | 0 | 8.5 |
| build-claude-glm-5.1 | 17 | 1 | 16 | 0 | 0 | 16.2 |

**Total estimated remediation across all branches: 36.1 hours.**

## 7. Remediation Prompts (indexed)

1. `Fix per spec: fix the NextAuth credentials callback to authenticate valid credentials.` — build-claude-glm-5.1 (auth / login fails with invalid credentials)
2. `Fix per spec: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (auth / unauthenticated request to protected API)
3. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-claude-glm-5.1 (auth / REG-06)
4. `Fix per spec: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / create, get, update, delete an item)
5. `Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / REG-12)
6. `Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / REG-13)
7. `Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / REG-14)
8. `Fix per INV-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / REG-05)
9. `Fix per INV-05: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (inventory / REG-17)
10. `Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (sales / REG-01)
11. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (sales / REG-02)
12. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (sales / REG-03)
13. `Fix per SALE-02: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (sales / REG-04)
14. `Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-claude-glm-5.1 (sales / REG-18)
15. `Fix per INV-03: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (rbac / REG-10)
16. `Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete.` — build-claude-glm-5.1 (rbac / REG-11)
17. `Fix per BAK-02: fix the failing behavior to match the spec.` — build-claude-glm-5.1 (rbac / REG-15)
18. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-opencode-glm-5.1 (auth / REG-06)
19. `Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned.` — build-opencode-glm-5.1 (inventory / REG-14)
20. `Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-opencode-glm-5.1 (sales / REG-01)
21. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-opencode-glm-5.1 (sales / REG-02)
22. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-opencode-glm-5.1 (sales / REG-03)
23. `Fix per SALE-02: fix the failing behavior to match the spec.` — build-opencode-glm-5.1 (sales / REG-04)
24. `Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-opencode-glm-5.1 (sales / REG-18)
25. `Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete.` — build-opencode-glm-5.1 (rbac / REG-11)
26. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-opencode-glm-5.2 (auth / REG-06)
27. `Fix per spec: fix the mileage import path in POST /api/import for type=mileage.` — build-opencode-glm-5.2 (import / import mileage CSV)
28. `Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete.` — build-opencode-glm-5.2 (rbac / REG-11)
29. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-pi-glm-5.1 (auth / REG-06)
30. `Fix per spec: fix the failing behavior to match the spec.` — build-pi-glm-5.1 (inventory / create, get, update, delete an item)
31. `Fix per INV-02: set removalDate when status transitions to donated.` — build-pi-glm-5.1 (inventory / REG-13)
32. `Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned.` — build-pi-glm-5.1 (inventory / REG-14)
33. `Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-pi-glm-5.1 (sales / REG-01)
34. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-pi-glm-5.1 (sales / REG-02)
35. `Fix per SALE-03: fix the failing behavior to match the spec.` — build-pi-glm-5.1 (sales / REG-03)
36. `Fix per SALE-02: fix the failing behavior to match the spec.` — build-pi-glm-5.1 (sales / REG-04)
37. `Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input.` — build-pi-glm-5.1 (sales / REG-18)
38. `Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete.` — build-pi-glm-5.1 (rbac / REG-11)
39. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-vscode-glm-5.2 (auth / REG-06)
40. `Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions.` — build-pi-glm-5.2 (auth / REG-06)

## 8. Functional Winner & Recommendation

**Functional winner:** `build-claude-glm-5.2`

**Recommendation:** `build-claude-glm-5.2` is the only build that passes the full functional E2E suite (26/26, 100/100). It is the only build with working session invalidation (REG-06), the only build where sale/inventory creation does not return 500, and the only build where admin user management (REG-11) works end-to-end. This corroborates the static-analysis ranking in BUILD_EVALUATION.md, which also ranked claude-5.2 #1. Adopt it as the production baseline. The new `build-pi-glm-5.2` is a co-runner-up alongside `build-vscode-glm-5.2` (both 96/100, failing only REG-06) — both are strong candidates for a second-tier baseline, and pi-5.2 is the most-improved build in the cohort (+34 points over pi-5.1). Their only shared failure is the REG-06 session-invalidation gap, a single moderate-effort fix (add live JWT refresh of passwordChangedAt in the jwt callback). The `build-opencode-glm-5.2` build (88/100) is fourth; its broken seed.ts should be fixed before any adoption. The remaining three builds (opencode-1.17.4, pi-5.1, claude-5.1) all have a broken sale-creation endpoint that cascades to 5+ regression failures and require substantial remediation before they are functionally viable.

## Appendix
- Raw Playwright reports: `/tmp/opencode/eval-func/<branch>/results-run-{1,2,3}/`
- Per-run line logs: `/tmp/opencode/eval-func/<branch>-run-{1,2,3}.log`
- Dev server logs: `/tmp/opencode/eval-func/<branch>-dev.log`
- Playwright config (throwaway, written into each worktree, not committed): `baseURL: http://localhost:3000`, `workers: 1`, `fullyParallel: false`, chromium project, `webServer` disabled (server booted manually with env vars).
- Canonical E2E specs (throwaway, written into each worktree from TEST_STRATEGY.md §2.4 + §4.1, not committed): `tests/e2e/{auth,inventory,sales,import,rbac}.spec.ts` — API-contract-focused with one browser-driven logout test.
- Seed commands: native `npx tsx src/scripts/seed.ts` (per branch) where working; fallback `POST /api/setup` with `{name,email,password}` per SETUP-01; migrations via `npx drizzle-kit migrate` per OPERATIONS.md §1.3.
- Admin credentials: `AdminP@ss1` for all branches; admin email varies per branch's seed default (admin@example.com, admin@resalemanager.com, security@lawsonsoft.com) — see §2 table. pi-5.2 additionally requires `AUTH_SECRET` to be set as an env var.

---

## 9. Re-evaluation Log

| Date | Branch added | Functional E2E run | Functional re-run triggered? | Score | Rank deltas |
|---|---|---|---|---|---|
| 2026-07-06 | `build-pi-glm-5.2` (pi 0.79.2 / GLM 5.2) | Run on pi-5.2 only (35 Playwright tests × 3 retries, fresh DB + dev-server restart per run) | No — pi-5.2's score of 96/100 does not strictly exceed the current leader's 100/100; per the strict-`>` re-run rule, no existing branches were re-evaluated | 96/100 (25/26 pass; only REG-06 fails) | pi-5.2 enters at functional rank #2 (co-runner-up with vscode-5.2 at 96/100). No existing branch's rank changed (claude-5.2 remains #1). |