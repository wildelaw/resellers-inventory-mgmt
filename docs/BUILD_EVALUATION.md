# Build Evaluation Report — Resell Inventory Manager v2

> **Date:** 2026-09-05 (updated)
> **Scope:** Evaluation of ten AI-generated builds of the Resell Inventory Manager v2 application against the specification in `docs/`, and against each other for maintainability, vulnerabilities, complexity, and variances.
> **Method:** Static source review + real `npm ci` / lint / `tsc --noEmit` / `vitest run` per branch (see Appendix A for methodology and raw logs).
> **Re-evaluation log:** 2026-09-05 — added `build-claude-glm-5.3-flash` (Claude Code 2.1.261 / GLM 5.3 Flash). Static analysis run on claude-5.3-flash only; existing 9 branches not re-analyzed (their prior results stand). Functional E2E run on claude-5.3-flash only (25/25 pass × 3 runs → 100/100; does not strictly exceed claude-5.2's 100/100 ceiling, so no functional re-run was triggered). claude-5.3-flash enters at **#2 by composite (4.35)**: spec 5★, maintain 4★, security 4★, complexity 4★, test signal 4★ (213 tests — new cohort count leader — but lint script broken), functional 100/100. Rank deltas: vscode-5.2 2→3, opencode-5.2 3→4, pi-5.2 4→5, claude-5.1 5→6, opencode-minimax-m3 6→7, opencode-5.1 7→8, pi-5.1 8→9, codex-5.2 9→10; claude-5.2 holds #1 (composite 4.85). See §11 for the full log.
> **Prior:** 2026-07-17 — composite-formula re-rank (no new branch). Ranks recomputed by the weighted composite formula (`BUILD_EVAL_PROMPT.md` STEP 6.2) from existing stars + functional scores; no static analysis or tests re-run. Deltas: vscode-5.2 6→2, opencode-5.2 4→3, pi-5.2 5→4, claude-5.1 2→5, opencode-minimax-m3 3→6; claude-5.2 #1, opencode-5.1 #7, pi-5.1 #8, codex-5.2 #9 hold. See §11 for the full log.
> **Prior:** 2026-07-16 — added `build-opencode-minimax-m3` (opencode 1.18.3 / MiniMax M3). Static analysis run on opencode-minimax-m3 only; existing 8 branches were not re-analyzed (their prior results stand). Functional re-run NOT triggered (opencode-minimax-m3 functional score cannot exceed claude-5.2's 100/100 ceiling). Rank deltas (at the time, under the prior judgment ranks): opencode-5.2 3→4, pi-5.2 4→5, vscode-5.2 5→6, opencode-5.1 6→7, pi-5.1 7→8, codex-5.2 8→9; opencode-minimax-m3 entered at #3 (later moved to #6 under the composite formula).
> **Prior:** 2026-07-08 — added `build-codex-glm-5.2` (Codex CLI 0.142.5 / GLM 5.2). Rank deltas (at the time): codex-5.2 enters at #8; no existing branch changed rank.

> **Note on `build-ibm-bob`:** An additional branch, `build-ibm-bob`, was attempted but **did not complete** — the agent ran out of usage quota (lowest Pro plan) mid-build before finishing the implementation. Because a partial build cannot be fairly compared against completed builds, it is **excluded from the evaluation below**. The branch exists in the repository for reference but is not scored or ranked.

---

## 1. Executive Summary

Ten branches were generated from a single one-shot prompt (`read and execute docs/BUILD_PROMPT.md to build this application`) using six coding agents and four models. Nine of the ten compile (`tsc --noEmit` clean) and pass their own test suites; `build-codex-glm-5.2` is the sole exception — it is the only branch where `tsc --noEmit` emits errors (exit 1, 101 errors: 62 in `src/`, 38 in `tests/`) and the only branch where `vitest run` exits 1 (16 of 93 tests fail). The newly added `build-claude-glm-5.3-flash` (Claude Code 2.1.261 on GLM 5.3 Flash — the first GLM-5.3-family model in the cohort) compiles clean, passes all **213 tests** (the largest suite in the cohort), ships the complete 4-tier test set (7 unit + 7 functional + **9 integration** + 5 e2e — the second branch ever with all 9 integration tests, after claude-5.2), and achieves **100/100 functional** (25/25 E2E pass × 3 runs), matching claude-5.2 at the ceiling. All ten honor the headline v2 simplifications (no CSRF token, no session revocation table, `canViewAll` toggle, `app_config` single-row, single-source `calculateProfit`, no phantom $0 sales).

`build-claude-glm-5.2` remains the clear leader: it is one of only two branches that ship the 9 required integration tests (with the newly added claude-5.3-flash), the only branch whose lint pipeline passes cleanly (zero errors, zero warnings), the only branch with a live-JWT-refresh callback that makes role/canViewAll/isActive changes take effect on existing sessions, and it combines the strengths of the prior leaders (claude-5.1's spec fidelity and type discipline + opencode-5.2's explicit SameSite=Strict cookie).

The newly added `build-claude-glm-5.3-flash` (Claude Code 2.1.261 / GLM 5.3 Flash) enters at **#2 by composite (4.35)** — the strongest new-build entry in the cohort's history. It matches claude-5.2's headline strengths: the canonical `export const POST = withAuth(...)` form (21 route files, zero non-canonical), correct `src/proxy.ts` with `export async function proxy`, the spec-correct `calculateSalesTaxFromPrice` formula, an explicit `sameSite: 'strict'` session cookie (with `__Secure-`/plain-name switching by environment), full NextAuth `declare module` + `declare module 'next-auth/jwt'` augmentations, **zero explicit type escapes** (0 `as any` / `: any` / `<any>` / `@ts-ignore` in `src/`), a **live DB refresh of `passwordChangedAt`** in the jwt callback (only claude-5.2 also does this — REG-06 passes end-to-end), `validateOriginOrReferer` exempting both `/api/auth/*` and `POST /api/setup` (rejecting when no `AUTH_URL` and no `Host` can be established — defensive), SEC-11 self-protection (self-deactivate/self-role-change/self-delete all blocked), photo upload type+size validation with UUID filenames, all 24 spec endpoints, full ops artifacts (multi-stage Dockerfile with non-root user + `/data` + healthcheck + a dedicated migrate-deps stage, Caddyfile with `match`-scoped 5/15min auth + 100/15min api zones, `drizzle/meta/_journal.json`), and the complete 4-tier test suite (7 unit + 7 functional + 9 integration + 5 e2e) passing 213/213. It achieves **100/100 functional** (25/25 E2E × 3 runs — REG-06 passes via its live `passwordChangedAt` refresh). Its gaps vs claude-5.2: its `lint` script uses the removed `next lint` command and it ships **no ESLint config at all** (no `eslint.config.mjs`, no legacy `.eslintrc.json`; `npx eslint .` also fails — lint pipeline non-functional), its live JWT refresh covers only `passwordChangedAt` (`role`/`canViewAll`/`isActive` are login-only), `withAuth` does not gate on `isActive`, bcrypt cost 10 is hardcoded at each call site rather than centralized, and it adds one module beyond the spec's 16 (`status-effects.ts` — a well-scoped centralization of removalDate side effects, treated as Info like claude-5.2's +4 precedent). It ranks #2 (composite 4.35) rather than #1 because claude-5.2's clean lint (5★ Maintainability), full live-field JWT refresh + `isActive` gate (5★ Security), and centralized bcrypt keep the older branch ahead on every star dimension (5/5/5/4/5 vs 5/4/4/4/4).
The newly added `build-opencode-minimax-m3` (opencode 1.18.3 on the MiniMax M3 model — the first build generated by a non-GLM model in the cohort) is a strong mid-pack build at **composite rank #7** (composite 3.82). It compiles clean (`tsc --noEmit` exit 0), passes all 135 tests (`vitest run` exit 0 — 15 files, 8 unit + 7 functional + 5 e2e), has **zero explicit type escapes** (0 `as any` / `: any` / `<any>` / `@ts-ignore` in `src/`), ships all 5 e2e spec files (auth, inventory, sales, import, rbac — matching claude-5.2/claude-5.1), uses the canonical `withAuth` wrapper form, correctly names `src/proxy.ts` with `export async function proxy`, uses the spec-correct `calculateSalesTaxFromPrice` formula, includes a full NextAuth `declare module` augmentation (covering `id`/`role`/`canViewAll`/`iat`/`passwordChangedAt` on the session), ships a complete 16-module `src/lib/` matching the spec list exactly, and includes full ops artifacts (multi-stage Dockerfile with non-root user + healthcheck, Caddyfile with correct rate limits, drizzle `meta/` journal). It also adds `serverExternalPackages` for `better-sqlite3`/`bcrypt` in `next.config.ts` (like claude-5.2, claude-5.3-flash, and opencode-5.1). However, it shares several gaps with the lower half of the cohort: its `lint` script uses the removed `next lint` command (no `eslint.config.mjs`, ships a legacy `.eslintrc.json` unreadable by ESLint v9), its JWT refresh is login-only (no live DB refresh — REG-06 will fail), `withAuth` does not reject deactivated accounts, no explicit SameSite cookie config, `validateOriginOrReferer` does not exempt `/api/auth/*` or `/api/setup`, and its `seed.ts` crashes with `Cannot find module 'dotenv/config'` (dotenv is not in `package.json` — same boot defect as opencode-5.2 and vscode-5.2; must fall back to `POST /api/setup`). It has zero integration tests (the spec requires 9). It ranks #7 by composite (3.82) because, despite 96/100 functional and zero type escapes, its 3★ Security (no explicit SameSite, no /api/auth/* exemption, login-only JWT refresh) and 3★ Test signal (lint broken) drag the composite below the four 96/100+ runner-ups above it.

The newly added `build-pi-glm-5.2` is the GLM-5.2 successor to `build-pi-glm-5.1` (the prior cohort's last-place build). It fixes all three of pi-5.1's critical defects: the `passwordChangedAt` session-invalidation bug (now written to the JWT at login), the `src/middleware.ts` naming violation (now correctly `src/proxy.ts`), and the missing `/mileage/export` + `/mileage/reports` endpoints (all 24 now present). It also adds an explicit `sameSite: 'strict'` cookie, brings its test suite up to the spec-required counts (7 unit + 7 functional = 137 passing tests, more than any non-Claude branch), and keeps the spec-correct `calculateSalesTaxFromPrice` formula. However, it still has zero integration tests and zero e2e specs, a broken lint pipeline (`next lint` removed in Next 16, no `eslint.config.mjs`, legacy `.eslintrc.json`), 50 type-escape occurrences in `src/` (29 `as any` + 17 `: any` + 4 `<any>`), no `Origin` exemption for `/api/auth/*` or `/api/setup` (an AUTH-04 regression vs pi-5.1, which exempted both), and its JWT refresh is login-only (no live DB refresh of `passwordChangedAt`/`role`/`canViewAll`/`isActive`, so REG-06 will fail). It ranks #4 by composite (3.97) — its 96/100 functional + 5★ Complexity (fewest files) pull it just above claude-5.1 (3.96) and opencode-5.2 (4.01) sits above it on the security 5★.

The newest addition, `build-codex-glm-5.2` (Codex CLI 0.142.5 on GLM 5.2), is the first build since `build-ibm-bob` to **not compile cleanly**. `tsc --noEmit` fails with 101 errors (62 in `src/`: `TS7053` implicit-any indexing of Drizzle update/insert builders in `admin/users` routes, `TS2719` two-different-`User`-type conflicts in admin pages, plus `TS2339`/`TS18048` in tests), and `vitest run` exits 1 with 16 failing tests (all 7 functional workflow tests, 2 unit auth tests, and the 1 integration test crash with `Cannot read properties of undefined` from a misused `.returning()` chain — the test inserts a user/item then reads `item[0].id` from the return value, but the insert helper doesn't unwrap the array). The build does ship several strengths: the smallest byte total in the cohort (230 KB, 74 ts/tsx files), zero explicit type escapes (cleaner on the explicit-escape metric than all but the two Claude branches and vscode-5.2), all 24 spec endpoints, correct `src/proxy.ts` naming, correct `calculateSalesTaxFromPrice` formula, full ops artifacts (multi-stage Dockerfile + Caddyfile with correct rate limits), all 5 e2e spec files (auth, inventory, sales, import, rbac — a `playwright.config.ts` is also present), and a complete 16-module `src/lib/` matching the spec list exactly. But because it does not type-check or pass its own tests, it ranks #9 (last place) by composite (2.65), below pi-5.1 (2.96). Its broken `lint` script (`next lint` removed, no `eslint.config.mjs`), login-only JWT refresh (no live DB refresh), no `isActive` gate in `withAuth`, no explicit SameSite cookie, no `/api/auth/*` Origin exemption, and missing `drizzle/meta/` journal are shared with the lower half of the cohort — the distinguishing failures are the `tsc`/`vitest` exits.

### Rankings

| Rank | Branch | Spec | Maintain | Security | Complexity | Test signal ★ | Functional | Composite |
|------|--------|------|----------|----------|------------|---------------|------------|-----------|
| **1** | `build-claude-glm-5.2` | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★★ (186 tests, all exit 0) | 100/100 | **4.85** |
| **2** | `build-claude-glm-5.3-flash` | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ (213 tests, vitest+tsc exit 0, lint broken) | 100/100 | **4.35** |
| **3** | `build-vscode-glm-5.2` | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ (100 tests, lint broken) | 96/100 | 4.02 |
| **4** | `build-opencode-glm-5.2` | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ | ★★★☆☆ (134 tests, lint broken) | 88/100 | 4.01 |
| **5** | `build-pi-glm-5.2` | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ (137 tests, lint broken) | 96/100 | 3.97 |
| **6** | `build-claude-glm-5.1` | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★☆☆ (121 tests, lint 11 err) | 35/100 | 3.96 |
| **7** | `build-opencode-minimax-m3` | ★★★★☆ | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★☆☆ (135 tests, lint broken) | 96/100 | 3.82 |
| **8** | `build-opencode-glm-5.1` | ★★★★☆ | ★★★☆☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ (115 tests, lint 119 err) | 69/100 | 3.62 |
| **9** | `build-pi-glm-5.1` | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ (95 tests, lint broken) | 62/100 | 2.96 |
| **10** | `build-codex-glm-5.2` | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★☆☆☆☆ (tsc exit 1, vitest exit 1) | 0/100 | **2.65** |

**Composite formula** (per `BUILD_EVAL_PROMPT.md` STEP 6.2): `0.20·spec + 0.20·maintain + 0.20·security + 0.15·complexity + 0.10·testSignal + 0.15·(functional/20)`. The `Test signal ★` column is derived from the rubric in STEP 6.1 (raw metrics: test count vs leader, vitest/tsc/lint exits); the raw test-signal text from prior reports is retained in §9 Appendix A. **Ranks 1..10 are assigned by the composite descending** (with the tie-breaker in STEP 6.3 if composites tie to 2 d.p. — no ties occurred in this cohort). The `Composite` column is the weighted score that produced each rank — no rank is asserted without the score that produced it.

**Why `build-codex-glm-5.2` ranks #9 despite 5★ Complexity:** its composite (2.65) is the lowest in the cohort. The 5★ Complexity (smallest byte footprint) is outweighed by 1★ Test signal (tsc exit 1 + vitest exit 1), 2★ Maintainability (50 type escapes, broken lint, tsc broken), and 0/100 functional (app does not boot). The composite column makes this reconciliation visible — the prior report's prose-only explanation is now backed by a numeric aggregate.

**Composite-driven reordering vs the prior judgment ranks:** adopting the composite as the rank determinant reorders the mid-pack. `build-vscode-glm-5.2` jumps #6→#2 (its 96/100 functional + clean 4★/4★/4★/4★ stars pull it up); `build-claude-glm-5.1` drops #2→#5 (its 35/100 functional drags the composite down despite 5★/5★ static stars); `build-opencode-minimax-m3` drops #3→#6 (96/100 functional is offset by 3★ security). The bottom three (#7 opencode-5.1, #8 pi-5.1, #9 codex-5.2) are unchanged. The §11 re-evaluation log records the deltas from this re-rank.

### Per-dimension winners
- **Spec conformance:** `build-claude-glm-5.2` — canonical `withAuth` wrapper, `src/proxy.ts` naming, exact 24-endpoint surface, full e2e suite, **and the first branch with all 9 required integration tests**. *Co-winner:* `build-claude-glm-5.3-flash` (canonical wrapper, correct proxy, all 24 endpoints, full 4-tier suite incl. 9 integration + 5 e2e, live `passwordChangedAt` refresh, explicit SameSite — the most complete spec-faithful profile in the cohort alongside claude-5.2) and `build-claude-glm-5.1` (same patterns, but no integration tests and missing `drizzle/meta/`).
- **Maintainability:** `build-claude-glm-5.2` — zero `as any` / `: any` / `@ts-ignore` in `src/`, proper NextAuth module augmentation, **lint passes with zero errors and zero warnings** (only branch to do so), centralized bcrypt cost in `config.ts`.
- **Vulnerabilities:** `build-claude-glm-5.2` — explicit `sameSite: 'strict'` cookie (SEC-01), live JWT refresh of `passwordChangedAt`/`role`/`canViewAll`/`isActive` on every request (stronger than AUTH-02 minimum), `withAuth` also rejects deactivated accounts, `validateOriginOrReferer` exempts both `/api/auth/*` and `/api/setup` and rejects when no host can be established. *Co-winner:* `build-opencode-glm-5.2` (also has explicit SameSite, clean typing, but lacks the live-refresh and the extra `isActive` gate). `build-claude-glm-5.3-flash` joins the top security tier (explicit SameSite + live `passwordChangedAt` refresh + both Origin exemptions) but its login-only refresh of `role`/`canViewAll`/`isActive` and missing `isActive` gate hold it at 4★.
- **Complexity:** `build-codex-glm-5.2` — smallest byte total in the cohort (230 KB). *Co-winner:* `build-pi-glm-5.2` (fewest files — 72, third-smallest bytes — 282 KB) and `build-opencode-glm-5.1` (second-smallest bytes — 242 KB). `build-pi-glm-5.1` is fourth-smallest by files (80). `build-vscode-glm-5.2` remains notable for 85 files / 268 KB with near-full type safety. `build-claude-glm-5.2` is mid-pack on raw size (357 KB) but its extra modules (`api-client.ts`, `inventory-logic.ts`, `app-shell.tsx`, `client-shell.tsx`) are well-scoped architectural improvements rather than incidental surface area. Note: codex-5.2's smallest-footprint win is offset by the fact that it does not compile or pass its own tests — the compactness is partly a symptom of incomplete type plumbing, not just disciplined design.
- **Test signal:** `build-claude-glm-5.2` — first branch with the complete 4-tier suite (7 unit + 7 functional + 9 integration + 5 e2e) and the only branch whose lint passes clean. `build-claude-glm-5.3-flash` matches the 4-tier suite and ships the largest suite in the cohort (213 tests, all passing) but its broken lint pipeline caps it at 4★.

### Overall recommendation
**`build-claude-glm-5.2`** is the recommended baseline. It dominates or co-leads every dimension: most spec-faithful, fully type-safe, cleanest lint, complete test suite across all four tiers, security-hardened (explicit SameSite + live JWT refresh + `isActive` enforcement), and canonical patterns throughout (`withAuth`, `src/proxy.ts`, 24 endpoints, `drizzle/meta/`). It has no high- or medium-severity findings. The only notable observation is that it adds four modules beyond the spec's literal list (`api-client.ts`, `inventory-logic.ts`, `app-shell.tsx`, `client-shell.tsx`), all of which are well-justified refinements rather than deviations. The new #2, `build-claude-glm-5.3-flash` (composite 4.35, functional 100/100), is the strongest alternative baseline ever produced by the cohort: it matches claude-5.2's functional ceiling (25/25 E2E), integration-test completeness, and core security posture, with a smaller footprint (285 KB vs 357 KB) — but its non-functional lint pipeline, partial live-refresh, and missing `isActive` gate leave claude-5.2 ahead on 3 of 5 dimensions.

---

## 2. Branch Profiles

| | `build-claude-glm-5.2` | `build-claude-glm-5.3-flash` | `build-claude-glm-5.1` | `build-opencode-minimax-m3` | `build-opencode-glm-5.1` | `build-opencode-glm-5.2` | `build-pi-glm-5.2` | `build-vscode-glm-5.2` | `build-pi-glm-5.1` | `build-codex-glm-5.2` |
|---|---|---|---|---|---|---|---|---|---|---|
| Agent | Claude Code | Claude Code| Claude Code | opencode | opencode 1.17.4 | opencode (current) | "pi" agent | VS Code (GitHub Copilot) | "pi" agent | Codex CLI |
| Agent version | Claude Code 2.1.196 | Claude Code 2.1.261| Claude Code 2.1.176 | opencode 1.18.3 | opencode 1.17.4 | opencode 1.17.4 | pi 0.79.2 | VS Code 1.126.0 (GitHub Copilot) | pi 0.79.2 | Codex CLI 0.142.5 |
| Model | GLM 5.2 | GLM 5.3 Flash| GLM 5.1 | MiniMax M3 | GLM 5.1 | GLM 5.2 | GLM 5.2 | GLM 5.2 | GLM 5.1 | GLM 5.2 |
| Commit | `d951f31` | `e3946ee`| `4ce31a9` | `de890ab` | `a54e68b` | `f4869dc` | `8f12e40` | `9e70fb6` | `0e8f3b2` | `3905f11` |
| ts/tsx files | 111 | 79| 96 | 78 | 95 | 97 | **72** | 85 | 80 | 74 |
| ts/tsx bytes | 356,980 | 285,480| 354,587 | 263,033 | **241,817** | 327,706 | 282,459 | 267,796 | 251,928 | **230,371** |
| API routes | 24 | 24| 24 | 24 | 24 | 25 (+`/sales/export`) | 24 | 24 | 22 (−`/mileage/export`, −`/mileage/reports`) | 24 |
| Pages | 18 | 17| 18 | 17 | 18 | 18 | 17 | 18 | 18 | 17 |
| Unit tests | 7 | 7| 7 | 8 | 7 | 7 | 7 | 7 | 6 | 7 (5 pass / 2 fail) |
| Functional tests | 7 | 7| 7 | 7 | 7 | 5 | 7 | 2 | 3 | 7 (1 pass / 6 fail) |
| Integration tests | **9** | **9**| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 (0 pass / 1 fail) |
| E2E specs | **5** | **5**| **5** | **5** | 0 | 0 | 0 | 1 | 0 | **5** (not run statically) |
| `as any` in `src/` | **0** | **0**| **0** | **0** | 60 | 9 | 29 | **1** | 26 | **0** |
| `: any` in `src/` | **0** | **0**| **0** | **0** | 36 | 0 | 17 | **0** | 37 | **0** |
| `<any>` in `src/` | 0 | 0| 0 | 0 | 1 | 0 | 4 | 0 | 10 | 0 |
| `@ts-ignore` | 0 | 0| 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 |
| Middleware file | `src/proxy.ts` ✓ | `src/proxy.ts` ✓| `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ | `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/proxy.ts` ✓ | `src/middleware.ts` ✗ | `src/proxy.ts` ✓ |
| `lint` script | `eslint .` (works) | `next lint` (broken)| `eslint` (works) | `next lint` (broken) | `eslint .` (works) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) |
| `eslint.config.mjs` | ✓ | ✗ (no config at all — no `.mjs`, no legacy rc)| ✓ | ✗ (legacy `.eslintrc.json`) | ✓ | ✗ | ✗ (legacy `.eslintrc.json`) | ✗ | ✗ | ✗ |
| `npm ci` | ✓ | ✓| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ `npm install` (no `package-lock.json` shipped; commit msg notes registry unavailable in sandbox) |
| `tsc --noEmit` | ✓ clean | ✓ clean| ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean | ✓ clean | **✗ exit 1 — 101 errors (62 src / 38 tests)** |
| `vitest run` | ✓ **186 pass** | ✓ **213 pass**| ✓ 121 pass | ✓ 135 pass | ✓ 115 pass | ✓ 134 pass | ✓ 137 pass | ✓ 100 pass | ✓ 95 pass | **✗ exit 1 — 77 pass / 16 fail (7 files fail)** |
| `npm run lint` | ✓ **exit 0 (0 err / 0 warn)** | exit 1 — `next lint` removed; no `eslint.config.mjs` **and no legacy `.eslintrc.json`**; `npx eslint .` fallback also fails| exit 1 — 11 err / 81 warn | exit 1 — `next lint` removed (legacy `.eslintrc.json` unreadable by ESLint v9) | exit 1 — 119 err / 72 warn | exit 1 — `next lint` removed | exit 1 — `next lint` removed | exit 1 — `next lint` removed | exit 1 — `next lint` removed | exit 1 — `next lint` removed (no `eslint.config.mjs`; ESLint v9 fallback also fails) |
| Extra deps | — | —| — | — | `uuid@^14` + `@types/uuid` | — | — | — | — | — |
| `next-auth` | `5.0.0-beta.30` | `5.0.0-beta.30`| `5.0.0-beta.30` | `^5.0.0-beta.30` | `5.0.0-beta.31` | `5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.30` | `5.0.0-beta.30` | `^5.0.0-beta.30` |
| `zod` | `^4.3.6` | `^4.3.6`| `^4.3.6` | `^4.3.6` | `^3.25.0` | `^4.3.6` | `^4.3.6` | `^4.3.6` | `^4.3.6` | `^4.3.6` |
| bcrypt cost (app) | 10 (centralized in `config.ts`) | 10 (hardcoded at each call site, not centralized)| **12** (inconsistent w/ seed) | 10 | 10 | 10 | 10 | 10 | 10 | 10 (hardcoded at each call site, not centralized) |
| SameSite cookie | **explicit `strict`** | **explicit `strict`**| default | default | default | **explicit `strict`** | **explicit `strict`** | default | default | default (no explicit cookies config in NextAuth) |

Notes:
- All ten target Next.js 16.2.x and React 19.2.4. `node_modules` installed cleanly under Node 24.15 / npm 11.12 with no peer-dep conflicts. `build-codex-glm-5.2` shipped no `package-lock.json` (the commit message notes the npm registry was unavailable in the build sandbox), so `npm ci` was replaced with `npm install` — a one-time install cost, not a build defect.
- **Only `build-claude-glm-5.2` and `build-claude-glm-5.3-flash` ship the 9 required integration tests.** All others have zero (codex-5.2 ships 1 of 9, which fails; opencode-minimax-m3 ships 0). claude-5.3-flash's 213-test suite is the largest in the cohort (23 vitest files: 7 unit + 7 functional + 9 integration, plus 5 Playwright e2e specs not run by vitest).
- **Only `build-claude-glm-5.2` passes `npm run lint` with exit 0.** claude-5.1 and opencode-5.1 have working ESLint but emit errors; opencode-5.2, pi-5.2, vscode-5.2, pi-5.1, codex-5.2, opencode-minimax-m3, and claude-5.3-flash use the removed `next lint` command. claude-5.3-flash is the only branch that ships no ESLint config in any format (no `eslint.config.mjs`, no legacy `.eslintrc.json`).
- **Only `build-codex-glm-5.2` fails `tsc --noEmit` and `vitest run`.** The other nine all compile clean and pass their own test suites.
- `build-claude-glm-5.3-flash` is the first build on a GLM-5.3-family model (GLM 5.3 Flash via Claude Code 2.1.261). It compiles clean, passes all 213 tests, has zero explicit type escapes, ships the full 4-tier suite (incl. all 9 integration tests and all 5 e2e specs — matching claude-5.2), uses the canonical `withAuth` form, correctly exports `proxy` from `src/proxy.ts`, performs a live DB refresh of `passwordChangedAt` in the jwt callback (REG-06 passes — only claude-5.2 also does this), has full `next-auth` + `next-auth/jwt` module augmentations, an explicit `sameSite: 'strict'` cookie with `__Secure-` name switching, and a well-documented `validateOriginOrReferer` with both `/api/auth/*` and `POST /api/setup` exemptions. Its seed script works natively (no dotenv crash — unlike opencode-5.2/vscode-5.2/minimax-m3) and auto-migrates via its own idempotent migrator. Its main gaps are: broken lint pipeline (`next lint` removed, zero ESLint config shipped), live JWT refresh covers only `passwordChangedAt` (`role`/`canViewAll`/`isActive` are login-only), no `isActive` gate in `withAuth`, bcrypt cost hardcoded at each call site, and seed admin email `security@lawsonsoft.com` (not `admin@example.com` — same as opencode-5.1/pi-5.2/codex-5.2).
- `build-opencode-minimax-m3` is the first build generated by a non-GLM model (MiniMax M3). It compiles clean, passes all 135 tests, has zero explicit type escapes, ships all 5 e2e spec files (matching claude-5.2 and claude-5.1), uses the canonical `withAuth` form, and correctly exports `proxy` from `src/proxy.ts`. It also has a complete NextAuth `declare module` augmentation covering `iat`/`passwordChangedAt` (unlike pi-5.2's incomplete augmentation). Its main gaps are: broken lint pipeline (`next lint` removed, ships legacy `.eslintrc.json`), `seed.ts` crashes with `Cannot find module 'dotenv/config'` (dotenv not in `package.json` — same defect as opencode-5.2 and vscode-5.2), login-only JWT refresh (REG-06 fails), no `isActive` gate, no explicit SameSite, no `/api/auth/*` Origin exemption, and zero integration tests.
- `build-pi-glm-5.2` is the second-smallest build by both file count (72) and byte total (282 KB) while shipping the most tests of any non-Claude branch (137). Its schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2) rather than raw integers.
- `build-vscode-glm-5.2` is the most type-safe non-Claude/non-minimax build (1 `as any` in `db.ts` Proxy, 0 `: any`, 0 `@ts-ignore`). However, it has the thinnest test suite of the completed builds (9 files / 100 tests, only 2 functional tests and 1 e2e spec, no integration tests).
- `build-codex-glm-5.2` is the smallest build by byte total (230 KB, 74 files) and ties claude-5.2/claude-5.1/vscode-5.2/opencode-minimax-m3 for the fewest explicit type escapes (0 across all four categories in `src/`). However, its zero-explicit-escape count is misleading: `tsc` surfaces 62 implicit-any errors in `src/`, so the source is not actually type-safe.
- `build-vscode-glm-5.2` has a **`calculateSalesTaxFromPrice` formula deviation**: it computes `price * rate` rather than the spec's `price - price/(1+rate)`. codex-5.2 and opencode-minimax-m3 use the spec formula correctly.
- `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-codex-glm-5.2`, `build-opencode-minimax-m3`, and `build-claude-glm-5.3-flash` all define `"lint": "next lint"`, which is **removed in Next.js 16**. Running `npm run lint` fails immediately. None ships `eslint.config.mjs`. pi-5.2 and minimax-m3 ship a legacy `.eslintrc.json` (ESLint v8 format), which ESLint v9 cannot read; claude-5.3-flash ships no ESLint config at all. Their lint pipelines are non-functional.

---

## 3. Spec Conformance Matrix

Legend: ✓ pass · ◐ partial · ✗ fail · — N/A

### 3.1 Architecture & simplifications (BUILD_PROMPT §"KEY SIMPLIFICATIONS")

| Requirement | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 roles + `canViewAll` (no `power_user`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all `schema.ts`: `role` enum `['admin','user']` + `canViewAll` |
| No CSRF token system | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `csrf.ts` / `csrf-provider.tsx` / `useCsrfToken.ts` in any branch |
| No `revoked_tokens` table | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas: 6 tables only |
| No account lockout columns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `failed_login_attempts`/`locked_until` |
| No in-app rate limiter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | no `rate-limit.ts` |
| Single-source profit (TS only) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all `reports/route.ts` use `calculateProfit`; 0 SQL profit expressions |
| No auto $0 sales on donate/discard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all set only `removalDate`; no `sales` insert on transition |
| `app_config` single-row table | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas: `appConfig` with `id default(1)` |
| Removed tables absent (`sessions`/`accounts`/`verification_tokens`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | all schemas |
| `withAuth` wrapper pattern | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ◐ | ✓ | ◐ | ◐ | claude-5.2 & claude-5.3-flash & claude-5.1 & opencode-m3 & opencode-5.1 & vscode-5.2 use `export const POST = withAuth(...)`; opencode-5.2, pi-5.2, pi-5.1, and codex-5.2 use `export async function POST(req){ return withAuth(...) }` (functionally equivalent, deviates from canonical form) |
| Server Components for data pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | `inventory/page.tsx`, `sales/page.tsx`, `reports/page.tsx`, `app/page.tsx` |
| `calculateSalesTaxFromPrice` formula matches spec | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** | ✓ | ✓ | vscode-5.2 uses `price * rate` (add tax) instead of `price - price/(1+rate)` (extract from tax-inclusive); pi-5.2 and codex-5.2 use the spec formula correctly |

### 3.2 API surface (BUILD_PROMPT STEP 5 — 43 endpoints)

| Endpoint group | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| All 43 spec endpoints present | ✓ | ✓ (all 24 present) | ✓ | ✓ (all 24 present) | ✓ | ✓ (+1 extra `/sales/export`) | ✓ | ✓ | ✗ missing `/mileage/export` & `/mileage/reports` | ✓ all 24 present |
| Removed endpoints absent | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/api/auth/*` exempt from Origin check | ✓ (also `/api/setup`) | ✓ (also `POST /api/setup`) | ✓ | **✗ no exemption** | ✗ | ◐ (no explicit exemption) | ✗ no exemption | ✗ no exemption | ✓ (also `/api/setup` POST) | ✗ no exemption |

### 3.3 Config & ops (BUILD_PROMPT STEPS 2, 6, 12)

| Requirement | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `src/proxy.ts` middleware (named per spec) | ✓ | ✓ | ✓ | ✓ | ✗ named `src/middleware.ts` | ✓ | ✓ | ✓ | ✗ named `src/middleware.ts` | ✓ |
| `next.config.ts` security headers + CSP | ✓ (+`serverExternalPackages`) | ✓ (+`serverExternalPackages`) | ✓ | ✓ (+`serverExternalPackages`) | ✓ (+`serverExternalPackages`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `Caddyfile` rate limit 5/15min auth + 100/15min api | ✓ (scoped via `handle`) | ✓ (scoped via `match`) | ✓ | ✓ (global zones) | ✓ (scoped via `handle_path /api/auth/*`) | ✓ | ✓ (global zones) | ✓ (global zones) | ✓ (global zones) | ✓ (global zones) |
| `Dockerfile` multi-stage + `/data` + non-root user | ✓ | ✓ (+dedicated migrate-deps stage) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| bcrypt cost factor 10 (SEC-02) | ✓ (centralized) | ✓ | ◐ uses **12** in app code, 10 in seed | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `drizzle.config.ts` → `./src/lib/schema.ts` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Migration `.sql` + `meta/` journal | ✓ | ✓ | ◐ missing `meta/` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ missing `meta/` (only `0000_initial.sql`) |

### 3.4 RBAC & auth (REQUIREMENTS §3.1, §3.7)

| Requirement | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `passwordChangedAt` session invalidation (AUTH-02) | **✓+** live-refresh on every request | **✓+** live refresh of `passwordChangedAt` (role/canViewAll/isActive login-only) | ✓ | ✓ login-only | ✓ | ✓ | ✓ login-only | ✓ | **✗ broken** — never written to JWT | ✓ login-only |
| `withAuth` also rejects deactivated accounts | ✓ | ✗ | ✗ | **✗** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| SEC-11 admin cannot deactivate/role-change own account | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| USR-02 password policy (8–128 + 4 char classes) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SameSite=Strict cookie (SEC-01) | **✓ explicit** | ✓ explicit | ◐ relies on default | ◐ relies on default | ◐ relies on default | **✓ explicit** | **✓ explicit** | ◐ relies on default | ◐ relies on default | ◐ relies on default |

### 3.5 Test conformance (BUILD_PROMPT STEP 10)

| Required suite | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 unit tests | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 8 (shipped 8, all pass) | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 6 | ◐ 7 present (5 pass / 2 fail: `api-auth`, `api-utils`) |
| 7 functional tests | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ✓ 7 | ◐ 5 | ✓ 7 | ◐ 2 (missing 5: `password-invalidation`, `setup-lock`, `sale-refund-flow`, `inventory-removal-date`, `refund-impact`) | ◐ 3 | ◐ 7 present (1 pass / 6 fail: all 4 `workflows/*` + `setup-lock` × 2 crash with `Cannot read properties of undefined`) |
| 9 integration tests | **✓ 9** | ✓ 9 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ✗ 0 | ◐ 1 present (`origin-validation`, failing) |
| 5 e2e specs | **✓ 5** | ✓ 5 | **✓ 5** | **✓ 5** | ✗ 0 | ✗ 0 | ✗ 0 | ◐ 1 (auth only) | ✗ 0 | **✓ 5** (auth, inventory, sales, import, rbac — not run statically; `playwright.config.ts` present) |

---

## 4. Maintainability

### 4.1 Type discipline (`src/` only — tests excluded)

| Branch | `as any` | `: any` | `<any>` | `@ts-ignore` | Total |
|---|---|---|---|---|---|
| `build-claude-glm-5.2` | **0** | **0** | 0 | 0 | **0** |
| `build-claude-glm-5.3-flash` | **0** | **0** | 0 | 0 | **0** |
| `build-claude-glm-5.1` | **0** | **0** | 0 | 0 | **0** |
| `build-opencode-minimax-m3` | **0** | **0** | 0 | 0 | **0** |
| `build-codex-glm-5.2` | **0** | **0** | 0 | 0 | **0** (explicit) |
| `build-vscode-glm-5.2` | **1** | **0** | 0 | 0 | **1** |
| `build-opencode-glm-5.2` | 9 | 0 | 0 | 0 | 9 |
| `build-pi-glm-5.2` | 29 | 17 | 4 | 0 | 50 |
| `build-pi-glm-5.1` | 26 | 37 | 10 | 2 | 75 |
| `build-opencode-glm-5.1` | 60 | 36 | 1 | 0 | 97 |

Both Claude 5.2-generation branches and the new `build-claude-glm-5.3-flash` are fully type-safe in `src/` — claude-5.3-flash achieves it with complete `declare module 'next-auth'` **and** `declare module 'next-auth/jwt'` augmentations (the only branch besides claude-5.2 and vscode-5.2 to augment the JWT type), so its `jwt`/`session` callbacks need zero casts. `build-codex-glm-5.2` ties them on the **explicit** escape count (0 across all four categories), but its cleanliness is misleading: `tsc --noEmit` surfaces 62 errors in `src/` (mostly `TS7053` "Element implicitly has an 'any' type" from indexing Drizzle update/insert builders with numeric keys in `admin/users` routes, plus `TS2719` dual-`User`-type conflicts in admin pages). In other words, codex-5.2's escapes are hidden as **implicit** `any` rather than written as `as any` — the source does not actually type-check, so the zero-explicit-escape metric overstates its type safety. The two Claude 5.x branches, claude-5.3-flash, and vscode-5.2 are the only branches whose `src/` both avoids explicit escapes **and** compiles clean. `build-vscode-glm-5.2` is very close — its single `as any` is in `db.ts` line 43 (`(actualDb as any)[prop]`) inside the lazy Proxy pattern, a pragmatic escape for dynamic property forwarding. `build-pi-glm-5.2` has 50 type-escape occurrences spread across route handlers (`status as any`, `platform as any`, `role as any` for Drizzle column comparisons), client components (`initialItems as any`, `initialSales as any` for Server→Client prop passing), session access (`(session.user as any).passwordChangedAt` — the NextAuth module augmentation omits `iat`/`passwordChangedAt` from the typed session), and backup serialization (`allUsers as any` etc.). The session-typing escapes mirror opencode-5.1's pattern (silencing the type checker rather than completing the NextAuth `declare module` augmentation), though pi-5.2 does declare a `Session` augmentation — it just doesn't extend it far enough to cover `iat`/`passwordChangedAt` on the JWT token type. opencode-5.1 has 97 type-escape occurrences concentrated in `auth.ts` session callbacks (e.g., `(session.user as any).id`), which silence the type checker rather than fix the missing NextAuth module augmentation. Claude, opencode-5.2, pi-5.2, and vscode-5.2 all ship proper `declare module 'next-auth'` augmentation; vscode-5.2 and claude-5.2 also augment `@auth/core/jwt`. codex-5.2 does **not** ship a NextAuth module augmentation — its `jwt`/`session` callbacks use `(user as { id: string }).id`/`(session.user as { role: ... }).role` inline casts, which avoids `as any` literally but still bypasses the type system (and contributes to the `TS2719` dual-type conflicts in admin pages).

### 4.2 Lint outcomes

| Branch | `lint` command | Result |
|---|---|---|
| `build-claude-glm-5.2` | `eslint .` | **exit 0 — 0 errors, 0 warnings** |
| `build-claude-glm-5.3-flash` | `next lint` | exit 1 — command removed in Next 16; **no ESLint config shipped at all** (no `eslint.config.mjs`, no legacy `.eslintrc.json`; `npx eslint .` fallback also fails — "ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file"); lint pipeline non-functional |
| `build-claude-glm-5.1` | `eslint` | exit 1 — 11 errors, 81 warnings (all errors are `no-explicit-any` in test files) |
| `build-opencode-minimax-m3` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs` (ships legacy `.eslintrc.json` unreadable by ESLint v9); lint pipeline non-functional |
| `build-opencode-glm-5.1` | `eslint .` | exit 1 — 119 errors, 72 warnings (errors spread across `src/` and tests) |
| `build-opencode-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-pi-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs` (ships legacy `.eslintrc.json` which ESLint v9 cannot read); lint pipeline non-functional |
| `build-pi-glm-5.1` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-vscode-glm-5.2` | `next lint` | exit 1 — command removed in Next 16; no `eslint.config.mjs`; lint pipeline non-functional |
| `build-codex-glm-5.2` | `next lint` | exit 1 — command removed in Next 16 (no `eslint.config.mjs`; `npx eslint .` fallback also fails: "ESLint couldn't find an eslint.config.(js\|mjs\|cjs) file"); lint pipeline non-functional |

**Winner:** `build-claude-glm-5.2` — only branch with a fully clean lint pass.

### 4.3 Module structure

- `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-pi-glm-5.2`, `build-codex-glm-5.2`: 16-module `src/lib/` matching the spec list exactly.
- `build-claude-glm-5.3-flash`: 17 modules — the spec's 16 plus `status-effects.ts` (a 27-line module centralizing the removalDate set/clear side-effect of status transitions, consumed by both the single-item and bulk routes; a well-scoped refinement that eliminates duplicated transition logic). Schema uses raw integer seconds for `passwordChangedAt` but `{ mode: 'timestamp_ms' }` for date columns and `{ mode: 'boolean' }` for flags — a clean mixed approach. Largest module is `backup.ts` (267 lines).
- `build-opencode-minimax-m3`: 16 modules matching the spec list exactly. Schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2 and pi-5.2). Includes a complete NextAuth `declare module` augmentation covering `id`/`role`/`canViewAll`/`iat`/`passwordChangedAt`. Largest module is `schema.ts` (221 lines).
- `build-codex-glm-5.2`: 16 modules matching the spec list exactly. Schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2 and pi-5.2), making inferred TS types `boolean`/`number` and avoiding the raw-integer conversion boilerplate. Largest module is `validations.ts` (274 lines), followed by `backup.ts` (206) and `schema.ts` (158) — a tight, conventional distribution.
- `build-claude-glm-5.2`: 19 modules — adds `api-client.ts` (typed client-side fetch helpers documenting the no-CSRF-token design), `inventory-logic.ts` (centralized status-transition + removalDate logic), plus `app-shell.tsx` (Server Component shell) and `client-shell.tsx` (client shell) in `src/components/`. Well-scoped architectural refinements.
- `build-opencode-glm-5.2`: 21 modules — adds `http-utils.ts`, `inventory-queries.ts`, `sales-queries.ts`, `rbac.ts`. Cleaner separation of concerns but deviates further from the spec's literal module list.
- `build-vscode-glm-5.2`: 16 modules matching the spec list exactly, with raw integer timestamps/booleans (like claude-5.2, no conversion needed). Schema uses `check` import from drizzle-orm (unused) — a minor leftover.
- `build-pi-glm-5.2`: 16 modules matching the spec list exactly. Schema uses Drizzle's `{ mode: 'boolean' }` / `{ mode: 'number' }` typing (like opencode-5.2), making the inferred TS types `boolean`/`number` and avoiding the raw-integer conversion boilerplate of claude-5.2/pi-5.1/vscode-5.2.

### 4.4 Documentation/comments
All ten branches include JSDoc on `calculateProfit` and `withAuth`. `build-claude-glm-5.3-flash` is second only to claude-5.2 on comment density — `auth.ts` opens with a comment explaining the `__Secure-` cookie-name switching, the jwt callback documents the live `passwordChangedAt` refresh, `status-effects.ts` documents the no-$0-sales rule, `proxy.ts` documents the Next 16 proxy renaming, and the Dockerfile documents why drizzle-orm needs a separate migrate-deps stage. `build-claude-glm-5.2` has the most thorough header comments — e.g. `auth.ts` opens with a multi-line block explaining the JWT refresh strategy and why it's necessary for AUTH-02. `build-pi-glm-5.2` includes concise JSDoc on `calculateProfit`, `validateOriginOrReferer`, and `withAuth`, plus inline comments on the profit formula ("SINGLE SOURCE OF TRUTH") and session-invalidation check, but lacks the longer architectural rationale of claude-5.2. `build-vscode-glm-5.2` includes concise JSDoc on all financial functions and the `withAuth` wrapper, but also lacks the longer architectural rationale comments of claude-5.2. `build-codex-glm-5.2` includes concise JSDoc on `calculateProfit` (with the full formula spelled out in the docstring), `calculateNetRevenue`, `calculateSalesTaxFromPrice`, and `withAuth`/`validateOriginOrReferer`, plus inline comments on the CSRF design ("replaces the v1 double-submit token") and session-invalidation check — comparable in density to pi-5.2/vscode-5.2, but lacking claude-5.2's longer architectural rationale. build-opencode-minimax-m3 includes concise JSDoc on all financial functions and withAuth, comparable in density to pi-5.2/vscode-5.2.

**Maintainability winner:** `build-claude-glm-5.2`.

---

## 5. Vulnerabilities

### 5.1 CSRF / Origin-Referer validation (SEC-01, AUTH-04)

All ten implement `validateOriginOrReferer` checking `Origin` then `Referer` against `AUTH_URL` (falling back to the request `Host`) for POST/PUT/DELETE/PATCH, returning 403 on missing/mismatched. No raw SQL, no `eval`, no `dangerouslySetInnerHTML` anywhere. Differences:

- **`build-claude-glm-5.2`**: most robust — configurable `ORIGIN_EXEMPT_PREFIXES = ['/api/auth/', '/api/setup']` list, rejects with 403 when neither `AUTH_URL` nor `Host` can be established (defensive).
- **`build-claude-glm-5.3-flash`**: equally compliant — hard-coded exemptions for `/api/auth/` (prefix) and `POST /api/setup` (exact method+path), prefers `AUTH_URL` when set, falls back to the request `Host`, and rejects with 403 when neither can be established (defensive). Treats empty-string Origin/Referer values as absent (some proxies strip the value).
- **`build-pi-glm-5.1`**: also exempts both `/api/auth/*` and `/api/setup` POST (correct).
- **`build-codex-glm-5.2`**: like claude-5.2, rejects with 403 when neither `Origin` nor `Referer` is present (defensive — "Missing Origin and Referer headers" branch), and also rejects when no `authUrl` can be derived. However, it does **not** exempt `/api/auth/*` or `/api/setup` (same AUTH-04 deviation as opencode-5.2/pi-5.2/vscode-5.2). Its `validateOriginOrReferer` is otherwise conventional and well-documented.
- **`build-claude-glm-5.1`**: exempts `/api/auth/*` only (matches spec minimum).
- **`build-opencode-glm-5.1`**, **`build-opencode-glm-5.2`**, **`build-pi-glm-5.2`**, **`build-vscode-glm-5.2`**, **`build-opencode-minimax-m3`**: do **not** exempt `/api/auth/*`. Spec violation (AUTH-04) — in practice the NextAuth credential callback route doesn't call `validateOriginOrReferer` so login still works, but the helpers are non-compliant. Note: pi-5.2 is a regression here vs pi-5.1, which did exempt both.

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

**`build-claude-glm-5.3-flash` joins the live-refresh tier** — its `jwt` callback refreshes `passwordChangedAt` from the database on every request (not just at login), so REG-06 passes end-to-end (verified functionally: 25/25 E2E). Unlike claude-5.2, it refreshes **only** `passwordChangedAt` — `role`, `canViewAll`, and `isActive` are stamped at login and not refreshed, and `withAuth` does not reject deactivated accounts. `build-vscode-glm-5.2` and the remaining branches (claude-5.1, opencode-5.1, opencode-5.2, **pi-5.2**, **codex-5.2**, opencode-minimax-m3) correctly propagate `passwordChangedAt` through the `jwt` callback at login time, but do not live-refresh it — so an admin password reset sets `passwordChangedAt` on the user row, but existing JWTs issued before the reset still carry the old (lower) `passwordChangedAt` and are not rejected until the token expires. `build-pi-glm-5.2` and `build-codex-glm-5.2` are both in this group: AUTH-02 is satisfied at login, but the functional E2E REG-06 scenario (admin resets password → existing session invalidated) will fail because the JWT's `passwordChangedAt` is frozen at login time. `build-vscode-glm-5.2` uses proper `declare module '@auth/core/jwt'` augmentation (like claude-5.2) so the token fields are typed without `as any`. `build-codex-glm-5.2` writes `token.passwordChangedAt = (user as { passwordChangedAt: number }).passwordChangedAt` at login (no `as any`, but no module augmentation either — it uses inline cast objects on `session.user`).

### 5.3 Cookie hardening (SEC-01)

`build-claude-glm-5.2`, `build-opencode-glm-5.2`, `build-pi-glm-5.2`, and `build-claude-glm-5.3-flash` all explicitly configure the NextAuth session cookie:

```ts
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',   // claude-5.3-flash: '__Secure-authjs.session-token' when secure
    options: { httpOnly: true, sameSite: 'strict', path: '/',
      secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' },
  },
},
```

`build-claude-glm-5.3-flash` is the most deliberate of the four: it switches the cookie **name** between `__Secure-authjs.session-token` (when secure) and `authjs.session-token` (plain HTTP dev/local smoke tests) and derives `secure` from `COOKIE_SECURE` with a production default — documented inline.

The other six (claude-5.1, opencode-5.1, pi-5.1, vscode-5.2, codex-5.2, opencode-minimax-m3) rely on NextAuth defaults, which set `sameSite=lax` (not `strict`). The spec (AUTH-04) states "Session cookies are set with `SameSite=Strict`". **Only claude-5.2, opencode-5.2, pi-5.2, and claude-5.3-flash satisfy this literally.** Severity: Medium.

### 5.4 Input validation, secrets, info leakage

| Check | claude-5.2 | claude-5.3-flash | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `eval(` / `dangerouslySetInnerHTML` | none | none | none | none | none | none | none | none | none | none |
| Raw SQL template literals | none | none | none | none | none | none | none | none | none | none |
| `sql.raw` usage | none | none | none | none | none | none | none | none | none | none |
| Hardcoded `AUTH_URL`/`NEXTAUTH_SECRET` | none | none | none | none | none | none | none | none | none | none |
| `console.log` (potential info leak) | 4 | 4 (3 in `seed.ts` + 1 in `migrate.ts`, none in routes/lib) | 9 | 2 (seed.ts only) | 6 | 3 | 7 | 7 | **13** | 4 (all in `seed.ts`, none in routes/lib) |
| Photo upload type+size validation (INV-05, SEC-07) | ✓ | ✓ (`ALLOWED_TYPES` map JPEG/PNG/GIF/WebP + 5 MB `MAX_SIZE` + UUID filename) | ✓ | ✓ (type + size + ext check) | ✓ | ✓ | ✓ (+ext) | ✓ (+extension check) | ✓ (+ext) | ✓ (`ALLOWED_TYPES` JPEG/PNG/GIF/WebP + 5 MB `MAX_SIZE`) |
| SEC-11 admin self-protection | ✓ | ✓ (blocks self-deactivate, self-role-change, self-delete; also blocks transfer-to-self) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (blocks self-deactivate, self-role-change, self-delete) |
| Password policy (USR-02) | ✓ | ✓ (8–128 + 4 char classes via `passwordSchema`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (8–128 + 4 char classes via `passwordSchema`) |

`console.log` density is highest in pi-5.1 (13). claude-5.2 is cleanest (4), tied with codex-5.2 (4 — all in `seed.ts`, none in routes/lib) and claude-5.3-flash (4 — three in `seed.ts`, one in `migrate.ts`, none in routes/lib), followed by opencode-5.2 (3). pi-5.2 (7) and vscode-5.2 (7) are mid-pack. None appear to log secrets in the sampled routes.

**Security winner:** `build-claude-glm-5.2` — explicit `sameSite: 'strict'`, live JWT refresh of all session-bearing fields, `isActive` enforcement, defensive `validateOriginOrReferer`, fully type-safe, clean `console.log` profile. *Co-winner:* `build-opencode-glm-5.2` (also has explicit SameSite and clean typing, but lacks the live-refresh and `isActive` gate). `build-claude-glm-5.3-flash` is the strongest security newcomer (explicit SameSite with `__Secure-` name switching, live `passwordChangedAt` refresh, both Origin exemptions) but its login-only refresh of `role`/`canViewAll`/`isActive` and missing `isActive` gate hold it just below the winners. `build-pi-glm-5.2` joins the explicit-SameSite tier but is held back by the missing `/api/auth/*` exemption and login-only JWT refresh. pi-5.1 is last due to the critical session-invalidation bug (now fixed in pi-5.2).

---

## 6. Complexity

| Branch | ts/tsx bytes | Files | Largest module | Extra modules vs spec |
|---|---|---|---|---|
| `build-codex-glm-5.2` | **230,371** | 74 | `validations.ts` 274 lines | 0 |
| `build-opencode-minimax-m3` | 263,033 | 78 | `schema.ts` 221 lines | 0 |
| `build-opencode-glm-5.1` | 241,817 | 95 | `schema.ts` ~5 KB | 0 (tightest) |
| `build-pi-glm-5.1` | 251,928 | 80 | `auth.ts` ~4 KB | 0 |
| `build-vscode-glm-5.2` | 267,796 | 85 | `reports/route.ts` 104 lines | 0 |
| `build-pi-glm-5.2` | 282,459 | **72** | `reports/route.ts` | 0 |
| `build-claude-glm-5.3-flash` | 285,480 | 79 | `backup.ts` 267 lines | +1 (`status-effects`) |
| `build-opencode-glm-5.2` | 327,706 | 97 | `inventory-queries.ts` 3.8 KB + `sales-queries.ts` | +4 (`http-utils`, `inventory-queries`, `sales-queries`, `rbac`) |
| `build-claude-glm-5.1` | 354,587 | 96 | `reports/route.ts` 99 lines | 0 |
| `build-claude-glm-5.2` | 356,980 | 111 | `reports/route.ts` 112 lines | +4 (`api-client`, `inventory-logic`, `app-shell`, `client-shell`) |

- **Lowest absolute complexity:** `build-codex-glm-5.2` (smallest byte total — 230 KB; fewest-explicit-escapes) and `build-pi-glm-5.2` (fewest files — 72, third-smallest bytes — 282 KB) and `build-opencode-glm-5.1` (second-smallest bytes — 242 KB). Co-winners on raw footprint. **Caveat for codex-5.2:** its smallest-footprint win is partly a symptom of incomplete type plumbing (62 implicit-any `tsc` errors in `src/`), not just disciplined design — the compactness comes with a non-compiling build. `build-pi-glm-5.2` achieves the smallest file count among compiling builds while shipping the most tests of any non-Claude branch (137) — a strong complexity-to-coverage ratio.
- **`build-vscode-glm-5.2`** remains notable for being the third-smallest by file count (85) and bytes (268 KB), while maintaining near-full type safety (1 `as any`).
- **`build-claude-glm-5.3-flash`** has the best complexity-to-capability ratio in the cohort: 285 KB / 79 files (sixth-smallest) while shipping the complete 4-tier suite (213 tests, incl. 9 integration + 5 e2e) and zero type escapes — 72 KB smaller than claude-5.2 while matching its test-tier completeness. Its single extra module (`status-effects.ts`, 27 lines) is the smallest extra-module footprint among branches that deviate from the 16-module list.
- **Highest complexity:** `build-claude-glm-5.2` (largest byte total and file count, driven by the 9 integration tests + 4 extra well-scoped modules) and `build-opencode-glm-5.2` (most lib modules). Claude-5.2's extra size is largely explained by its complete test suite (which the spec requires) and architectural refinements.
- No branch shows pathological cyclomatic complexity in sampled routes; the longest single route handler observed was under 190 lines (`build-codex-glm-5.2` `src/app/api/import/route.ts` at 185 lines — within the prior cohort's under-130-line observation, now extended by codex-5.2's import route, but still not pathological).

**Complexity winner:** `build-codex-glm-5.2` (smallest bytes) co-winner with `build-pi-glm-5.2` (fewest files among compiling builds) and `build-opencode-glm-5.1` (second-smallest bytes). `build-claude-glm-5.3-flash` is the complexity-per-feature leader (4★ — 1.24× leader bytes with full test-tier completeness). Note: `build-claude-glm-5.2` is the largest but its complexity is justified by test coverage and module decomposition that improves maintainability. codex-5.2's footprint win is discounted in the overall ranking by its `tsc`/`vitest` failures.

---

## 7. Variances Between Branches

| Dimension | claude-5.3-flash | claude-5.2 | claude-5.1 | opencode-m3 | opencode-5.1 | opencode-5.2 | pi-5.2 | vscode-5.2 | pi-5.1 | codex-5.2 |
|---|---|---|---|---|---|---|---|---|---|---|
| `withAuth` signature | `export const POST = withAuth(...)` — matches spec | `export const POST = withAuth(...)` — matches spec | same as claude-5.2 | `export const POST = withAuth(...)` — matches spec | same as claude-5.2 | wraps inside `async function POST` | wraps inside `async function POST` | `export const POST = withAuth(...)` — matches spec | `withAuth(req, handler)` — different signature | wraps inside `async function POST` |
| Middleware filename | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/proxy.ts` (spec) | `src/middleware.ts` (Next.js) | `src/proxy.ts` (spec) |
| `lint` script | `next lint` (broken) | `eslint .` (works, clean) | `eslint` (works) | `next lint` (broken) | `eslint .` (works) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) | `next lint` (broken) |
| `eslint.config.mjs` | no (no config at all) | ✓ | ✓ | no (legacy `.eslintrc.json`) | ✓ | ✗ | ✗ (legacy `.eslintrc.json`) | ✗ | ✗ | ✗ |
| Schema timestamp mode | `{ mode: 'timestamp_ms' }` (Date) for dates; raw seconds for `password_changed_at` | raw integer (unix s) | raw integer (unix s) | `{ mode: 'number' }` (typed number) | `{ mode: 'timestamp' }` (Date) | raw integer (unix s) | `{ mode: 'number' }` (typed number) | raw integer (unix s) | raw integer (unix s) | `{ mode: 'number' }` (typed number) |
| Schema boolean mode | `{ mode: 'boolean' }` | raw 0/1 + `toBool`/`fromBool` helpers | raw 0/1 integer | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | `{ mode: 'boolean' }` | raw 0/1 integer | raw 0/1 integer | `{ mode: 'boolean' }` |
| JWT callback refreshes live fields from DB | **passwordChangedAt only** (every request); role/canViewAll/isActive login-only | **✓** every request | ✗ login-only | login-only | ✗ login-only | ✗ login-only | ✗ login-only | ✗ login-only | ✗ login-only (broken) | ✗ login-only |
| `withAuth` rejects deactivated accounts | no | **✓** | ✗ | no | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| `calculateSalesTaxFromPrice` formula | spec: `price - price/(1+rate)` | spec: `price - price/(1+rate)` | same | spec: `price - price/(1+rate)` | same | same | same | **differs: `price * rate`** (adds tax, not extracts) | same | spec: `price - price/(1+rate)` |
| NextAuth module augmentation | `next-auth` + `next-auth/jwt` (complete) | `next-auth` + `@auth/core/jwt` | `next-auth` + `@auth/core/jwt` | next-auth only (complete — covers iat/passwordChangedAt) | `next-auth` only | `next-auth` only | `next-auth` only (incomplete — `iat`/`pca` untyped) | `next-auth` + `@auth/core/jwt` | none (uses `as any`) | none (uses inline `as { ... }` casts) |
| Extra dependency | — | — | — | — | `uuid@^14` + `@types/uuid` | — | — | — | — | — |
| zod version | v4 | v4 | v4 | v4 | **v3** | v4 | v4 | v4 | v4 | v4 |
| Extra API endpoint | — | — | — | — | — | `+ /api/sales/export` | — | — | — | — |
| Missing API endpoints | — | — | — | — | — | — | — | — | `− /mileage/export`, `− /mileage/reports` | — |
| Migration `meta/` journal | yes | ✓ | ✗ missing | yes | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ missing (only `0000_initial.sql`) |
| bcrypt cost (app code) | 10 (hardcoded at each call site) | 10 (centralized in `config.ts`) | **12** (inconsistent w/ seed) | 10 | 10 | 10 | 10 | 10 | 10 | 10 (hardcoded at each call site) |
| SameSite cookie config | **explicit `'strict'`** (+`__Secure-` name switching) | **explicit `strict`** | default | default | default | **explicit `strict`** | **explicit `strict`** | default | default | default |
| `serverExternalPackages` in next.config | yes | yes | no | yes | yes | no | no | no | no | no |
| Caddyfile rate-limit scoping | scoped via `match` (auth path + mutation method) | scoped via `handle /api/auth/*` | global zones | global zones | scoped via `handle_path /api/auth/*` | global zones | global zones | global zones | global zones | global zones |
| Extra modules (beyond spec list) | 1 (`status-effects`) | `api-client`, `inventory-logic`, `app-shell`, `client-shell` | 0 | 0 | 0 | `http-utils`, `inventory-queries`, `sales-queries`, `rbac` | 0 | 0 | 0 | 0 |
| Seed admin email | `security@lawsonsoft.com` (env-overridable) | admin@example.com | admin@resalemanager.com | admin@example.com | security@lawsonsoft.com | admin@example.com (via /api/setup) | security@lawsonsoft.com | admin@example.com (via /api/setup) | admin@example.com | security@lawsonsoft.com |
| `tsc --noEmit` | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | ✓ exit 0 | **✗ exit 1 (101 errors)** |
| `vitest run` | ✓ 213 pass | ✓ 186 pass | ✓ 121 pass | ✓ 135 pass | ✓ 115 pass | ✓ 134 pass | ✓ 137 pass | ✓ 100 pass | ✓ 95 pass | **✗ 77 pass / 16 fail** |

Notable interpretation differences:
- **JWT refresh strategy:** claude-5.2 is the only branch that refreshes `passwordChangedAt`/`role`/`canViewAll`/`isActive` from the DB on every request inside the `jwt` callback. claude-5.3-flash is the only branch that live-refreshes `passwordChangedAt` alone (so REG-06 passes) while keeping `role`/`canViewAll`/`isActive` login-only. The other eight (including codex-5.2 and opencode-minimax-m3) copy `passwordChangedAt` and the role fields only at login, meaning role/canViewAll changes don't propagate to existing JWTs until the token expires or the password is reset. pi-5.2, codex-5.2, and opencode-minimax-m3 are all in this login-only group but, unlike pi-5.1, at least write `passwordChangedAt` at login so the AUTH-02 minimum is met. codex-5.2 writes `token.passwordChangedAt = (user as { passwordChangedAt: number }).passwordChangedAt` at login (no `as any`, but no module augmentation either — it uses inline cast objects on `session.user`).
- **`calculateSalesTaxFromPrice` formula:** vscode-5.2 is the only branch that deviates from the spec formula. The spec requires `taxAmount = price - (price / (1 + rate))` (extract tax from a tax-inclusive price), but vscode-5.2 implements `price * rate` (compute tax to add to a tax-exclusive price). These produce different results: for price=100 and rate=0.0825, the spec formula yields 7.62, while vscode-5.2 yields 8.25. Its test passes because it asserts the implementation's output, not the spec's expected value. pi-5.2 and codex-5.2 both use the spec formula correctly.
- **Timestamp/boolean schema modes:** opencode-5.1 uses `{ mode: 'timestamp' }` (Date); opencode-5.2, pi-5.2, and codex-5.2 use `{ mode: 'boolean' }` / `{ mode: 'number' }`, which makes the inferred TS types `boolean`/`number` instead of raw integers. This is more ergonomic and avoids the `toBool`/`fromBool` conversion boilerplate. Claude-5.2, claude-5.1, pi-5.1, and vscode-5.2 store raw unix integers and avoid the conversion; claude-5.2 additionally ships `toBool`/`fromBool` helpers.
- **`withAuth` signature:** pi-5.1's signature (`withAuth(req, handler)`) is the largest API-shape deviation. pi-5.2, opencode-5.2, and codex-5.2 use the `async function POST(req){ return withAuth(...) }` form (functionally equivalent, deviates from canonical). vscode-5.2, all three Claude branches (claude-5.2, claude-5.3-flash, claude-5.1), opencode-5.1, and opencode-m3 use the canonical `export const POST = withAuth(...)` form. claude-5.3-flash documents the pattern in the `withAuth` JSDoc and applies it uniformly across all 21 route files.
- **`validateOriginOrReferer` exemptions:** pi-5.2 regressed vs pi-5.1 — pi-5.1 exempted both `/api/auth/*` and `/api/setup`, but pi-5.2 exempts neither. This is shared with opencode-5.2, vscode-5.2, and codex-5.2. Only claude-5.2 (both paths), claude-5.3-flash (`/api/auth/*` prefix + `POST /api/setup` exact), and pi-5.1 (both paths) fully comply; claude-5.1 partially complies (`/api/auth/*` only).
- **bcrypt cost:** claude-5.2 centralizes cost 10 in `config.ts` via a `hashPassword()` helper — the cleanest approach. claude-5.1 uses cost 12 in app code but 10 in seed (inconsistent). The others (including pi-5.2, vscode-5.2, and codex-5.2) hardcode 10 at each call site (4 sites in codex-5.2: `setup`, `admin/users`, `admin/users/[id]/reset-password`, `profile`).
- **Seed admin email:** pi-5.2, codex-5.2, and claude-5.3-flash (like opencode-5.1) seed `security@lawsonsoft.com`, not `admin@example.com`. claude-5.3-flash additionally supports `ADMIN_EMAIL`/`ADMIN_PASSWORD` env overrides and resets `passwordChangedAt: 0` on re-seed (documented as a recovery scenario). This matters for functional E2E: the canonical specs assume `admin@example.com`, so the pi-5.2/codex-5.2 worktree's seed must be read to get the correct admin credentials. codex-5.2's seed creates only the admin user (no regular `user@example.com`), so functional tests that need a standard user must create one via the admin API.
- **`tsc --noEmit` and `vitest run`:** codex-5.2 is the **only** branch where either fails. `tsc` exits 1 with 101 errors (62 in `src/` — `TS7053` implicit-any indexing of Drizzle update/insert builders in `admin/users` routes, `TS2719` dual-`User`-type conflicts in admin pages; 38 in `tests/` — `TS2339`/`TS18048` from misusing `.returning()` chain). `vitest` exits 1 with 16 of 93 tests failing (all 7 functional workflow tests, 2 unit auth tests, the 1 integration test) with `Cannot read properties of undefined (reading 'id')` — the test helpers read `item[0].id` from `db.insert(...).returning()` but the return value isn't unwrapped as expected. The other seven branches all compile clean and pass their own test suites.

## 8. Findings by Severity

| Sev | Branch | Finding | Location |
|---|---|---|---|
| **High** | `build-codex-glm-5.2` | `tsc --noEmit` exits 1 with 101 errors (62 in `src/`: `TS7053` implicit-any indexing of Drizzle update/insert builders, `TS2719` dual-`User`-type conflicts; 38 in `tests/`) — only branch that does not compile | `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/admin/users/page.tsx`, `tests/**` |
| **High** | `build-codex-glm-5.2` | `vitest run` exits 1: 16 of 93 tests fail (all 7 functional workflow tests, 2 unit auth tests, 1 integration test) with `Cannot read properties of undefined (reading 'id')` from misused `.returning()` chain in test helpers | `tests/functional/workflows/*`, `tests/unit/api-auth.test.ts`, `tests/unit/api-utils.test.ts`, `tests/integration/api/origin-validation.test.ts` |
| **High** | `build-pi-glm-5.1` | `passwordChangedAt` never written to JWT → session invalidation always no-ops (AUTH-02/SEC-03 broken) | `src/lib/auth.ts:90-97` |
| **High** | `build-opencode-minimax-m3`, `build-opencode-glm-5.2`, `build-vscode-glm-5.2` | `seed.ts` crashes: Cannot find module 'dotenv/config' (dotenv not in package.json — broken boot script) | `src/scripts/seed.ts` |
| **High** | `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-codex-glm-5.2`, `build-opencode-minimax-m3`, `build-claude-glm-5.3-flash` | `lint` script uses removed `next lint`; no `eslint.config.mjs`; lint pipeline non-functional | `package.json` scripts |
| **Med** | `build-vscode-glm-5.2` | `calculateSalesTaxFromPrice` uses `price * rate` instead of spec's `price - price/(1+rate)` (SALE-04 deviation) | `src/lib/financial.ts:48` |
| **Med** | `build-opencode-glm-5.1`, `build-opencode-glm-5.2`, `build-pi-glm-5.2`, `build-vscode-glm-5.2`, `build-codex-glm-5.2`, `build-opencode-minimax-m3` | `validateOriginOrReferer` does not exempt `/api/auth/*` (AUTH-04 deviation) | `src/lib/api-utils.ts` / `http-utils.ts` |
| **Med** | `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-codex-glm-5.2`, `build-opencode-minimax-m3` | No explicit `SameSite=Strict` on session cookie (relies on NextAuth default `lax`) | `src/lib/auth.ts` |
| **Med** | `build-pi-glm-5.1` | Missing `/api/mileage/export` and `/api/mileage/reports` endpoints (MILE-02, MILE-03) | `src/app/api/mileage/` |
| **Med** | claude-5.1, opencode-5.1, opencode-5.2, pi-5.2, pi-5.1, vscode-5.2, opencode-minimax-m3 | No integration tests produced (spec requires 9 under `tests/integration/api/`) | `tests/integration/` absent |
| **Med** | `build-pi-glm-5.2`, `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-opencode-glm-5.2`, `build-pi-glm-5.1`, `build-vscode-glm-5.2`, `build-codex-glm-5.2`, `build-opencode-minimax-m3` | JWT refresh is login-only — `passwordChangedAt`/`role`/`canViewAll`/`isActive` not refreshed from DB on every request (AUTH-02 minimum met, but REG-06 functional scenario fails) | `src/lib/auth.ts` jwt callback |
| **Med** | `build-claude-glm-5.3-flash` | Live JWT refresh covers `passwordChangedAt` only — `role`/`canViewAll`/`isActive` changes don't propagate to existing JWTs until re-login, and `withAuth` does not gate on `isActive` (deactivated accounts retain access until token expiry) | `src/lib/auth.ts` jwt callback, `src/lib/api-utils.ts` withAuth |
| **Med** | `build-codex-glm-5.2` | Only 1 of 9 required integration tests (origin-validation only; and it fails at runtime) | `tests/integration/` |
| **Med** | `build-vscode-glm-5.2` | Only 2 of 7 required functional tests (missing `password-invalidation`, `setup-lock`, `sale-refund-flow`, `inventory-removal-date`, `refund-impact`) | `tests/functional/` |
| **Low** | `build-opencode-glm-5.1`, `build-pi-glm-5.1` | Middleware named `src/middleware.ts` not `src/proxy.ts` (BUILD_PROMPT STEP 6) | `src/` |
| **Low** | `build-claude-glm-5.1`, `build-codex-glm-5.2` | Migration directory lacks `meta/_journal.json` (only `.sql`); may break `drizzle-kit migrate` | `drizzle/` |
| **Low** | `build-claude-glm-5.1` | bcrypt cost 12 in app code, 10 in seed (inconsistent; both ≥ spec) | `src/app/api/*/route.ts`, `src/scripts/seed.ts` |
| **Low** | `build-opencode-glm-5.1` | zod v3 pinned while spec ecosystem is v4; 97 type-escape occurrences in `src/` | `package.json`, `src/lib/auth.ts` |
| **Low** | `build-opencode-glm-5.1` | Adds `uuid@^14` dependency not used by core id flow | `package.json` |
| **Low** | `build-pi-glm-5.2` | 50 type-escape occurrences in `src/` (29 `as any` + 17 `: any` + 4 `<any>`); NextAuth module augmentation incomplete (`iat`/`passwordChangedAt` untyped on session, accessed via `as any`) | `src/lib/api-utils.ts`, `src/lib/auth-utils.ts`, `src/app/*/page.tsx`, `src/lib/backup.ts` |
| **Low** | `build-codex-glm-5.2` | No `package-lock.json` shipped (commit msg notes npm registry unavailable in build sandbox); `npm ci` must be replaced with `npm install` (one-time install cost, not a build defect) | `package.json` (no lockfile) |
| **Low** | `build-codex-glm-5.2` | No NextAuth module augmentation — `jwt`/`session` callbacks use inline `(user as { id: string }).id` casts (avoids `as any` literally but bypasses the type system; contributes to `TS2719` dual-`User`-type conflicts in admin pages) | `src/lib/auth.ts:51-71`, `src/app/admin/users/page.tsx:53` |
| **Low** | `build-vscode-glm-5.2` | Only 1 of 5 required e2e specs (auth only; missing inventory, sales, rbac, import) | `tests/e2e/` |
| **Low** | `build-vscode-glm-5.2` | Schema imports `check` from drizzle-orm but never uses it (dead import) | `src/lib/schema.ts:1` |
| **Info** | `build-claude-glm-5.2` | Extra modules `api-client`, `inventory-logic`, `app-shell`, `client-shell` (well-scoped refinements, spec-list deviation) | `src/lib/`, `src/components/` |
| **Info** | `build-opencode-glm-5.2` | Extra modules `http-utils`, `inventory-queries`, `sales-queries`, `rbac` (cleaner separation, spec-list deviation) | `src/lib/` |
| **Info** | `build-pi-glm-5.1` | 13 `console.log` in `src/` (highest density) | various |
| **Info** | `build-vscode-glm-5.2` | 1 `as any` in `db.ts` Proxy pattern (pragmatic escape for dynamic property forwarding) | `src/lib/db.ts:43` |
| **Info** | `build-codex-glm-5.2` | Smallest byte total in the cohort (230 KB) and zero explicit type escapes (0 `as any`/`: any`/`<any>`/`@ts-ignore` in `src/`) — but the zero-escape count is misleading: `tsc` surfaces 62 implicit-any errors in `src/`, so the source does not actually type-check. Ships all 5 e2e spec files (matching claude-5.2/claude-5.1) and a `playwright.config.ts` | `src/app/api/admin/users/`, `tsc` log |
| **Info** | `build-opencode-minimax-m3` | First build generated by a non-GLM model (MiniMax M3); zero explicit type escapes, tsc clean, 135 tests pass, 5 e2e specs, canonical withAuth + proxy naming, complete NextAuth module augmentation | `src/` |
| **Info** | `build-claude-glm-5.3-flash` | First GLM-5.3-family build; second branch ever (after claude-5.2) with the full 4-tier suite incl. all 9 integration tests; largest suite in the cohort (213 tests); complete `next-auth` + `next-auth/jwt` augmentations; live `passwordChangedAt` refresh (REG-06 passes); explicit SameSite with `__Secure-` name switching; best complexity-to-capability ratio (285 KB with full test tiers) | `src/`, `tests/` |

---

## 9. Appendix A — Methodology

1. **Worktrees.** Each branch was checked out into an isolated git worktree under `/tmp/opencode/eval/<branch>` so all could be inspected and built without checkout churn. The `main` branch remained checked out in the primary workspace for writing this report.
2. **Static analysis.** File censuses used `find` + `wc`. Type-escape and dangerous-pattern counts used `grep -rn` over `src/` (tests excluded unless noted). Module/endpoint presence used `find` and `git ls-tree`. Critical modules (`schema.ts`, `financial.ts`, `api-utils.ts`, `auth.ts`, `validations.ts`, `reports/route.ts`, `inventory/[id]/route.ts`, `inventory/bulk/route.ts`, `sales/route.ts`, `admin/users/[id]/route.ts`, `next.config.ts`, `Caddyfile`, `Dockerfile`, `proxy.ts`/`middleware.ts`) were read in full.
3. **Dynamic verification.** Per worktree: `npm ci --no-audit --no-fund` (or `npm install` where no lockfile shipped — codex-5.2), then `npm run lint` (or `next lint` where scripted), then `npx tsc --noEmit`, then `npm test` (`vitest run`). Nine of ten installed cleanly and compiled/passed tests under Node 24.15 / npm 11.12; codex-5.2 installed cleanly but is the sole branch where `tsc` exits 1 (101 errors) and `vitest` exits 1 (16/93 fail). E2E (`playwright test`) was not run statically: the three Claude branches, opencode-minimax-m3 (ships all 5 e2e specs), vscode-5.2 (1), and codex-5.2 ship e2e specs (codex-5.2 and claude-5.3-flash ship all 5), and running Playwright was deemed informational per the approved plan; unit/functional/integration results are weighted instead. codex-5.2's and claude-5.3-flash's 5 e2e specs are exercised in the functional E2E pass (docs/FUNCTIONAL_EVALUATION.md).
4. **No patching.** Per the approved plan, branches were not modified to repair failures — a broken lint script, failing `tsc`, failing `vitest`, or missing endpoint was recorded as-is to preserve "single one-shot prompt" fidelity.
5. **No commits to build branches.** This report is the only file written to the repo on `main`; nothing was committed to any build branch. Worktrees and logs under `/tmp/opencode/eval/` are throwaway.
6. **`build-ibm-bob` excluded.** An eleventh branch attempt (`build-ibm-bob`) was made but did not complete — the agent exhausted its usage quota on the lowest Pro plan mid-build. Since a partial build cannot be fairly compared against completed builds, it is excluded from all evaluation sections. The branch remains in the repository for reference.
7. **Relative star ratings.** Stars are relative to the current cohort, not absolute: 5★ = current best in the cohort per dimension. When a new branch is added, the whole cohort is re-ranked and stars rescaled so the leader = 5★. As of `BUILD_EVAL_PROMPT.md` rev 3, the per-dimension star thresholds are explicit (see STEP 6.1 of that prompt) and the overall 1..N rank is determined by a weighted composite formula (STEP 6.2): `0.20·spec + 0.20·maintain + 0.20·security + 0.15·complexity + 0.10·testSignal + 0.15·(functional/20)`. The §1 Rankings table includes the `Test signal ★`, `Functional`, and `Composite` columns so every rank is backed by a visible score. See the re-evaluation log below for rank deltas from each update.

### Raw verification results

| Branch | `npm ci` | `npm run lint` | `tsc --noEmit` | `vitest run` |
|---|---|---|---|---|
| `build-claude-glm-5.2` | exit 0 | **exit 0 — 0 err / 0 warn** | exit 0 (clean) | exit 0 — **23 files, 186 tests** |
| `build-claude-glm-5.3-flash` | exit 0 | exit 1 — `next lint` removed; no ESLint config shipped at all (`npx eslint .` also fails) | exit 0 (clean) | exit 0 — **23 files, 213 tests** |
| `build-claude-glm-5.1` | exit 0 | exit 1 — 11 err / 81 warn | exit 0 (clean) | exit 0 — 14 files, 121 tests |
| `build-opencode-minimax-m3` | exit 0 | exit 1 — `next lint` removed; legacy `.eslintrc.json` unreadable by ESLint v9 | exit 0 (clean) | exit 0 — 15 files, 135 tests |
| `build-opencode-glm-5.1` | exit 0 | exit 1 — 119 err / 72 warn | exit 0 (clean) | exit 0 — 14 files, 115 tests |
| `build-opencode-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 12 files, 134 tests |
| `build-pi-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16; legacy `.eslintrc.json` unreadable by ESLint v9 | exit 0 (clean) | exit 0 — 14 files, 137 tests |
| `build-pi-glm-5.1` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 9 files, 95 tests |
| `build-vscode-glm-5.2` | exit 0 | exit 1 — `next lint` removed in Next 16 | exit 0 (clean) | exit 0 — 9 files, 100 tests |
| `build-codex-glm-5.2` | `npm install` (no lockfile) | exit 1 — `next lint` removed; no `eslint.config.mjs`; `npx eslint .` fallback also fails | **exit 1 — 101 errors (62 src / 38 tests)** | **exit 1 — 77 pass / 16 fail (7 files fail)** |

### Endpoint inventory (per branch)

All ten expose the core 22 endpoints (`/api/health`, `/api/auth/[...nextauth]`, `/api/setup`, `/api/inventory*`, `/api/sales`, `/api/sales/[id]`, `/api/mileage`, `/api/mileage/[id]`, `/api/photos/[itemId]/[filename]`, `/api/profile`, `/api/reports`, `/api/import`, `/api/settings`, `/api/admin/{users,backup,setup-unlock}`). Variances:
- `build-opencode-glm-5.2` adds `/api/sales/export` (not required, harmless).
- `build-pi-glm-5.1` omits `/api/mileage/export` and `/api/mileage/reports` (required by MILE-02/MILE-03).
- `build-codex-glm-5.2` adds `/api/admin/restore` (separate from `/api/admin/backup`) and `/api/admin/users/[id]/reset-password` — both are reasonable refinements, not spec deviations; the 24-route count matches the spec surface.
- `build-claude-glm-5.2`, `build-claude-glm-5.3-flash`, `build-claude-glm-5.1`, `build-opencode-glm-5.1`, `build-opencode-minimax-m3`, `build-pi-glm-5.2`, `build-vscode-glm-5.2`, and `build-codex-glm-5.2` match the spec surface exactly (codex's extra admin routes are additive, within the 24-route count).

### Test files present (per branch)

```
build-claude-glm-5.2:        7 unit + 7 functional + 9 integration + 5 e2e + 3 setup + 3 helpers  (34 files)
build-claude-glm-5.3-flash: 7 unit + 7 functional + 9 integration + 5 e2e + 4 setup + 1 helper  (32 files)
build-claude-glm-5.1:        7 unit + 7 functional              + 5 e2e + 3 setup            (22 files)
build-codex-glm-5.2:         7 unit + 7 functional + 1 integration + 5 e2e + 2 setup + 1 helper  (23 files)
build-opencode-minimax-m3:    8 unit + 7 functional                    + 5 e2e + 2 setup + 1 helper (23 files)
build-opencode-glm-5.1:     7 unit + 7 functional                    + 2 setup            (16 files)
build-opencode-glm-5.2:     7 unit + 5 functional                    + 2 setup            (14 files)
build-pi-glm-5.2:            7 unit + 7 functional                    + 2 setup            (16 files)
build-pi-glm-5.1:            6 unit + 3 functional                    + 2 setup            (11 files)
build-vscode-glm-5.2:        7 unit + 2 functional              + 1 e2e + 3 setup            (13 files)
```
Integration tests (`tests/integration/`): **9 files in `build-claude-glm-5.2` (all passing); 9 files in `build-claude-glm-5.3-flash` (all passing — 24 integration test cases); 1 file in `build-codex-glm-5.2` (failing); 0 in all other branches (including opencode-minimax-m3).**

---

## 10. Bottom Line

**Composite scores** (ranks 1..10, ordered by composite descending per `BUILD_EVAL_PROMPT.md` STEP 6.2): claude-5.2 **4.85** (#1), claude-5.3-flash **4.35** (#2), vscode-5.2 **4.02** (#3), opencode-5.2 4.01 (#4), pi-5.2 3.97 (#5), claude-5.1 3.96 (#6), opencode-minimax-m3 3.82 (#7), opencode-5.1 3.62 (#8), pi-5.1 2.96 (#9), codex-5.2 **2.65** (#10). The composite is the weighted aggregate of the five dimension stars + functional score, and **is the rank determinant** — every rank above is assigned by composite descending (no ties to 2 d.p. occurred, so no tie-breaker was invoked).

- **Best overall build:** **`build-claude-glm-5.2`** (#1, composite 4.85, functional 100/100). It is the most spec-faithful, the most type-disciplined, the only branch with a complete 4-tier test suite (incl. the 9 required integration tests), the only branch whose lint passes with zero errors/warnings, and the most security-hardened (explicit SameSite=Strict + live JWT refresh + `isActive` enforcement). It has no high- or medium-severity findings. Adopt it as the production baseline.
- **#2 `build-claude-glm-5.3-flash`** (composite 4.35, functional 100/100 — 25/25 E2E × 3 runs) is the strongest build the cohort has produced after claude-5.2 and the only other branch that matches it on the headline strengths: the complete 4-tier suite (7 unit + 7 functional + 9 integration + 5 e2e — 213 tests, all passing), zero explicit type escapes with full `next-auth` + `next-auth/jwt` augmentations, a live DB refresh of `passwordChangedAt` (REG-06 passes), explicit `sameSite: 'strict'` with `__Secure-` name switching, both Origin exemptions, SEC-11 self-protection, spec-correct tax formula, and full ops artifacts — all in a 285 KB / 79-file footprint (72 KB smaller than claude-5.2). What separates it from #1: its lint pipeline is non-functional (`next lint` removed; ships no ESLint config at all — the only branch with none), its live JWT refresh covers only `passwordChangedAt` (role/canViewAll/isActive are login-only), `withAuth` lacks an `isActive` gate, and bcrypt cost is hardcoded per call site. If adopted, add an `eslint.config.mjs`, extend the jwt-callback refresh to role/canViewAll/isActive, and add an `isActive` check in `withAuth` — all three are small, well-scoped fixes.
- **#3 `build-vscode-glm-5.2`** (composite 4.02, functional 96/100) is a compact, type-safe build (1 `as any`, 0 `: any`) with all 24 endpoints, correct `src/proxy.ts`, and full ops artifacts. Its 96/100 functional + clean 4★/4★/4★/4★ stars pull it to #2 despite a broken lint script. Its main gaps are: thinnest test suite of completed builds (9 files / 100 tests, only 2 functional + 1 e2e, no integration), broken lint script (`next lint`), `calculateSalesTaxFromPrice` formula deviation from spec, and no explicit SameSite cookie. If adopted, fix the tax formula, add the missing functional/integration/e2e tests, and port SameSite config from claude-5.2.
- **#4 `build-opencode-glm-5.2`** (composite 4.01, functional 88/100) is the most security-hardened alternative — also has explicit SameSite and clean typing, but its lint pipeline is broken (`next lint` removed in Next 16, no `eslint.config.mjs`), it lacks the live JWT refresh and `isActive` gate, and it deviates from the canonical `withAuth` signature.
- **#5 `build-pi-glm-5.2`** (composite 3.97, functional 96/100) is the most-improved build in the cohort: it fixes all three of pi-5.1's critical defects (session-invalidation bug, middleware naming, missing mileage endpoints), adds explicit SameSite, and ships the most tests of any non-Claude branch (137, incl. the full 7 unit + 7 functional spec set). Its remaining gaps are: zero integration tests, zero e2e specs, broken lint pipeline (`next lint` removed, legacy `.eslintrc.json`), 50 type-escape occurrences, no `/api/auth/*` Origin exemption (regression vs pi-5.1), and login-only JWT refresh (so REG-06 will fail functionally). If adopted, fix the lint pipeline (add `eslint.config.mjs`), add the `/api/auth/*` exemption, complete the NextAuth module augmentation to remove `as any` on session fields, add the 9 integration tests, and implement live JWT refresh.
- **#6 `build-claude-glm-5.1`** (composite 3.96, functional 35/100) — same canonical patterns and type discipline as claude-5.2, but no integration tests, missing `drizzle/meta/`, lint emits 11 errors, and no explicit SameSite cookie. Note its functional score (35/100) is much lower than several branches ranked below it — its 5★/5★ static stars keep it at #5 because the composite weights functional at only 0.15. Port the SameSite config and `drizzle/meta/` from claude-5.2 if you stay on 5.1.
- **#7 `build-opencode-minimax-m3`** (composite 3.82, functional 96/100) is the first build generated by a non-GLM model (MiniMax M3 via opencode 1.18.3). It compiles clean, passes all 135 tests, has zero explicit type escapes, ships all 5 e2e spec files (matching claude-5.2/claude-5.1), uses the canonical `withAuth` form, correctly exports `proxy` from `src/proxy.ts`, and includes a complete NextAuth module augmentation. Despite 96/100 functional, it lands at #6 because its 3★ Security (no explicit SameSite, no /api/auth/* exemption, login-only JWT refresh) and 3★ Test signal (lint broken) drag the composite below the four runner-ups above. Its main gaps are: broken lint pipeline, `seed.ts` crashes (missing `dotenv`), login-only JWT refresh (REG-06 fails), no `isActive` gate, no explicit SameSite, no `/api/auth/*` Origin exemption, and zero integration tests. If adopted, fix the seed script (add `dotenv` to devDeps or remove the `import 'dotenv/config'` line), add `eslint.config.mjs`, add the `/api/auth/*` exemption, add explicit SameSite, implement live JWT refresh, and add the 9 integration tests.
- **#8 `build-opencode-glm-5.1`** (composite 3.62, functional 69/100) is compact and works, but its 97 type escapes and zod v3 pin make it the worst-positioned for future maintenance despite the small footprint.
- **Avoid `build-pi-glm-5.1` as a production baseline (#9, composite 2.96, functional 62/100):** its session-invalidation bug is silent and security-critical, and it is missing two required mileage endpoints. (These are all fixed in pi-5.2.)
- **#10 `build-codex-glm-5.2`** (composite 2.65, functional 0/100 — last place) is the only branch that does not compile (`tsc` exit 1, 101 errors) and the only branch whose own test suite fails (`vitest` exit 1, 16/93). It ships several genuine strengths — the smallest byte footprint (230 KB, hence 5★ Complexity), zero explicit type escapes, all 24 spec endpoints, correct `src/proxy.ts` naming, correct `calculateSalesTaxFromPrice` formula, full ops artifacts, and all 5 e2e spec files (matching claude-5.2) — but these are outweighed by the non-compiling/non-passing foundation (1★ Test signal, 0/100 functional). The composite (2.65, lowest) is what reconciles its 5★ Complexity with the #9 rank. Its implicit-any errors concentrate in `admin/users` routes (Drizzle builder indexing) and its test failures come from a misused `.returning()` chain in test helpers. If adopted, the first fix is to resolve the 62 `src/` `tsc` errors (add a NextAuth module augmentation to resolve the `TS2719` dual-`User` conflicts; fix the `admin/users` route to use Drizzle's typed `.set()`/`.values()` builder API instead of numeric-key indexing), then fix the test helpers' `.returning()` unwrapping so the 16 failing tests pass, then add the 8 missing integration tests, add `eslint.config.mjs`, add the `/api/auth/*` Origin exemption, add explicit SameSite, and implement live JWT refresh.
- **`build-ibm-bob`** was not completed (agent ran out of quota on the lowest Pro plan) and is therefore excluded from the comparison. A fair evaluation would require re-running the build with sufficient quota.

The prior cohort's single biggest shared gap — the **complete absence of integration tests** — is closed by `build-claude-glm-5.2` and now matched by `build-claude-glm-5.3-flash` (each 9 integration test files; claude-5.3-flash 24 integration cases, all passing). `build-codex-glm-5.2` ships 1 integration test (failing). The other seven branches still have zero integration tests.

---

## 11. Re-evaluation Log

| Date | Branch added | Static analysis | Functional re-run triggered? | Rank deltas |
|---|---|---|---|---|
| 2026-09-05 | `build-claude-glm-5.3-flash` (Claude Code 2.1.261 / GLM 5.3 Flash) | Run on claude-5.3-flash only; existing 9 branches not re-analyzed (their prior results stand) | No — claude-5.3-flash scores 100/100 (25/25 pass × 3 runs; Z = 7 flow + 18 REG), which equals but does not strictly exceed claude-5.2's 100/100 ceiling; per the strict-`>` re-run rule, no existing branches were re-evaluated | claude-5.3-flash enters at **#2** (composite 4.35: spec 5★, maintain 4★, security 4★, complexity 4★, test signal 4★ — 213 tests, vitest+tsc exit 0, lint broken; functional 100/100). Rank deltas: vscode-5.2 2→3, opencode-5.2 3→4, pi-5.2 4→5, claude-5.1 5→6, opencode-minimax-m3 6→7, opencode-5.1 7→8, pi-5.1 8→9, codex-5.2 9→10. claude-5.2 holds #1 (composite 4.85). Dimension winners unchanged: spec claude-5.2 (co claude-5.3-flash, claude-5.1), maintain claude-5.2, security claude-5.2 (co opencode-5.2), complexity codex-5.2 (co pi-5.2, opencode-5.1), test signal claude-5.2. Baseline recommendation unchanged: claude-5.2. |
| 2026-07-17 | (no new branch) — composite-formula re-rank per `BUILD_EVAL_PROMPT.md` rev 3 | No new static analysis (existing results stand); ranks recomputed by the new weighted composite formula (STEP 6.2) from existing stars + functional scores | No — methodology change only, no test re-run | Composite-derived re-rank (old → new): vscode-5.2 6→2, opencode-5.2 4→3, pi-5.2 5→4, claude-5.1 2→5, opencode-minimax-m3 3→6; claude-5.2 #1, opencode-5.1 #7, pi-5.1 #8, codex-5.2 #9 all hold. No raw metrics or stars changed — only the rank aggregation rule. Prior judgment-based ranks are superseded; the historical entries below record deltas as they were at the time of each branch addition. |
| 2026-07-16 | `build-opencode-minimax-m3` (opencode 1.18.3 / MiniMax M3) | Run on opencode-minimax-m3 only; existing 8 branches not re-analyzed | No — opencode-minimax-m3 functional score cannot exceed claude-5.2's 100/100 ceiling; per the strict-`>` re-run rule, no existing branches were re-evaluated | opencode-minimax-m3 enters at #3. Rank deltas: opencode-5.2 3→4, pi-5.2 4→5, vscode-5.2 5→6, opencode-5.1 6→7, pi-5.1 7→8, codex-5.2 8→9 |
| 2026-07-08 | `build-codex-glm-5.2` (Codex CLI 0.142.5 / GLM 5.2) | Run on codex-5.2 only; existing 7 branches not re-analyzed (their prior results stand) | No — codex-5.2 is the only branch where `tsc --noEmit` and `vitest run` both fail (exit 1, 101 tsc errors, 16/93 vitest failures); its functional score cannot exceed claude-5.2's 100/100 ceiling, so per the strict-`>` re-run rule no existing branches were re-evaluated | codex-5.2 enters at #8 (new last place); no existing branch changes rank. Complexity star: pi-5.2 4→5 (now co-leader with codex-5.2: pi-5.2 has fewest files among compiling builds, codex-5.2 has smallest bytes) |
| 2026-07-06 | `build-pi-glm-5.2` (pi 0.79.2 / GLM 5.2) | Run on pi-5.2 only; existing 6 branches not re-analyzed | No — pi-5.2 functional score expected ≤ claude-5.2's 100/100 ceiling; per the strict-`>` re-run rule, no existing branches were re-evaluated | `build-vscode-glm-5.2` 4→5, `build-opencode-glm-5.1` 5→6, `build-pi-glm-5.1` 6→7; pi-5.2 enters at #4 |