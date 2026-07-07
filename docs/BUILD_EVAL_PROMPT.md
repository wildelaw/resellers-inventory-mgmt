# Build Evaluation Prompt — Resell Inventory Manager v2

> **Purpose:** This is a reusable, self-contained, branch-agnostic prompt that drives a coding agent to run the static (source-level) evaluation of all completed builds and write `docs/BUILD_EVALUATION.md`. It is the static-analysis counterpart to `docs/FUNCTIONAL_EVAL_PROMPT.md`.
>
> **How to use:** Copy everything inside the fenced block below (between the `--- BEGIN PROMPT ---` and `--- END PROMPT ---` markers) and paste it into any coding agent with read/write access to this repository. The agent should be able to run shell commands, check out git branches, and install npm dependencies. The prompt auto-discovers `build-*` branches, so new model/agent branches are picked up without editing this file.
>
> **Adding a new branch:** Create the new `build-<agent>-<model>` branch from the one-shot `docs/BUILD_PROMPT.md`, then re-run this prompt. The agent will discover the new branch, run static analysis on only it (existing branches are not re-analyzed), re-rank the whole cohort, and update `docs/BUILD_EVALUATION.md` + `site/assets/data.js`.

---

## BEGIN PROMPT

You are a coding agent. Your task is to run a full static (source-level) evaluation of all completed builds of the Resell Inventory Manager v2 application and write/update the results in `docs/BUILD_EVALUATION.md`. You must also update `site/assets/data.js` so the GitHub Pages site renders the results.

### Read first (in this order, completely)

1. `docs/REQUIREMENTS.md` — what the app does (simplified v2 requirements)
2. `docs/ARCHITECTURE.md` — how it's structured (simplified schema, auth, API)
3. `docs/IMPLEMENTATION.md` — how to write the code (configs, patterns, route wrapper)
4. `docs/API_REFERENCE.md` — every endpoint
5. `docs/OPERATIONS.md` — deployment, backup, monitoring (Caddy rate limiting)
6. `docs/TEST_STRATEGY.md` — what tests to write (the test-tier rubric)
7. `docs/BUILD_PROMPT.md` — the one-shot prompt the builds were generated from (this is your rubric for spec conformance)
8. `docs/BUILD_EVALUATION.md` — the existing static report (you will append/update this)

### Scope — branch discovery (do NOT hard-code the branch list)

Discover the completed build branches automatically:

```bash
BRANCHES=$(git branch -r | grep -E '^\s*origin/build-' | sed 's#origin/##' | sort)
```

**Exclude `build-ibm-bob`** — it did not complete. Exclude any branch explicitly marked as incomplete in the existing `docs/BUILD_EVALUATION.md` re-evaluation log.

The set of branches to evaluate is dynamic. All tables in the report grow a new column per new branch. Sort branches by their current ranking (best first) for report readability.

### Ranking policy (critical)

Stars and ranks are **relative to the current cohort**, not absolute:

1. **5★ = current cohort leader** per dimension (spec conformance, maintainability, security, complexity, test signal), not a fixed bar. When a new branch is added, the whole cohort is re-ranked (renumber 1..N) and stars rescaled so the leader = 5★ on each dimension.
2. **Adding a branch requires:**
   - (a) Full static analysis of the new branch only (the new branch is analyzed from scratch; existing branches are NOT re-analyzed — their prior results stand).
   - (b) **Re-ranking the entire cohort** (renumber ranks; rescale stars so the leader = 5★; recompute per-dimension winners and the overall recommendation if leadership changed).
   - (c) Updating `docs/BUILD_EVALUATION.md` and `site/assets/data.js` with the new branch's column/row everywhere.
3. **No re-analysis of existing branches** for static evaluation (unlike functional, where a re-run may be triggered). Static properties (file counts, type escapes, lint results) do not change between evaluations, so re-running them would produce identical results.
4. **Re-evaluation log:** append a dated entry to `docs/BUILD_EVALUATION.md` recording: date, branch added, rank deltas, and whether a functional re-run was triggered (cross-reference `docs/FUNCTIONAL_EVALUATION.md`).

### Fidelity rules (critical)

1. **Do not patch any build branch.** Branches are preserved as single one-shot-prompt artifacts. If a build has a broken lint script or missing endpoint, record it as-is.
2. **Do not commit anything to any build branch.** Only commit the eval docs + `site/assets/data.js` on `main` at the end.
3. **Do not modify any spec doc** (`docs/*.md`) other than writing/updating `docs/BUILD_EVALUATION.md` (and appending to the re-evaluation log).

### STEP 1 — Prepare worktrees

For each discovered branch, create an isolated git worktree:

```bash
mkdir -p /tmp/opencode/eval
for b in $BRANCHES; do
  git worktree add /tmp/opencode/eval/$b $b
done
```

If a worktree already exists from a prior run, remove it first (`git worktree remove --force`) and re-add — worktrees are recreated idempotently.

### STEP 2 — Run the static battery per branch

In each worktree, run and record every output:

```bash
cd /tmp/opencode/eval/$b

# 1. Install
npm ci --no-audit --no-fund

# 2. Type check
npx tsc --noEmit
# Record: exit code (0 = clean)

# 3. Unit/functional/integration tests
npm test   # (vitest run)
# Record: exit code, number of test files, number of tests

# 4. Lint
npm run lint
# Record: exit code, error count, warning count. If the script uses `next lint` (removed in Next.js 16), record "command removed in Next 16". If no `eslint.config.mjs`, record "no eslint.config.mjs". Try `npx eslint .` as a fallback to distinguish "script broken" from "eslint runs but emits errors".
```

### STEP 3 — Static census per branch

```bash
cd /tmp/opencode/eval/$b

# File census
find src -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l                    # ts/tsx file count
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -exec wc -c {} + | tail -1 # ts/tsx byte total

# API route count
git ls-tree -r --name-only HEAD | grep -E 'src/app/api/.+/route\.ts' | wc -l

# Page count
git ls-tree -r --name-only HEAD | grep -E 'src/app/.+/page\.tsx' | wc -l

# Module list vs spec's 16
git ls-tree -r --name-only HEAD | grep -E '^src/lib/[^/]+\.ts$'

# Middleware filename
git ls-tree -r --name-only HEAD | grep -E '^src/(proxy|middleware)\.ts$'

# ESLint config
git ls-tree -r --name-only HEAD | grep -iE 'eslint'

# Drizzle migrations
git ls-tree -r --name-only HEAD | grep -E '^drizzle/'

# Type escapes (src/ only — tests excluded)
grep -rn "as any" src --include='*.ts' --include='*.tsx' | wc -l
grep -rn ": any" src --include='*.ts' --include='*.tsx' | wc -l
grep -rn "<any>" src --include='*.ts' --include='*.tsx' | wc -l
grep -rn "@ts-ignore" src --include='*.ts' --include='*.tsx' | wc -l

# Info leakage
grep -rn "console.log" src --include='*.ts' --include='*.tsx' | wc -l

# Dangerous patterns (should be 0)
grep -rn "eval(" src --include='*.ts' --include='*.tsx' | wc -l
grep -rn "dangerouslySetInnerHTML" src --include='*.tsx' | wc -l
grep -rn "sql.raw" src --include='*.ts' | wc -l
```

### STEP 4 — Read critical modules in full

For each branch, read these modules in full and grade them against the spec conformance matrix:

- `src/lib/schema.ts` — 6 tables (users, items, sales, photos, mileage, app_config); no `power_user`, no `sessions`/`accounts`/`verification_tokens`/`revoked_tokens`; no `failed_login_attempts`/`locked_until`; `can_view_all` boolean; `password_changed_at`; `app_config` single-row
- `src/lib/auth.ts` — JWT writes `passwordChangedAt`? live refresh? `sameSite: 'strict'`? `isActive` gate?
- `src/lib/api-utils.ts` — `validateOriginOrReferer` exemptions (`/api/auth/*`, `/api/setup`)? `withAuth` signature form (canonical `export const POST = withAuth(...)` vs `async function POST(req){ return withAuth(...) }`)?
- `src/lib/financial.ts` — `calculateSalesTaxFromPrice` formula = `price - price/(1+rate)` (spec) vs `price * rate` (deviation)?
- `src/proxy.ts` or `src/middleware.ts` — named per spec?
- `src/lib/validations.ts` — password policy (8–128 + 4 char classes)?
- `next.config.ts` — security headers + CSP?
- `Caddyfile` — rate limit 5/15min auth + 100/15min api?
- `Dockerfile` — multi-stage + `/data` + non-root user?
- `drizzle.config.ts` → `./src/lib/schema.ts`?
- `src/scripts/seed.ts` — admin email, bcrypt cost
- `src/app/api/reports/route.ts` — uses `calculateProfit` (no SQL profit)?
- `src/app/api/inventory/route.ts` — `withAuth` pattern, RBAC
- `src/app/api/sales/route.ts` — sale creation, no auto-$0-sales
- `src/app/api/inventory/bulk/route.ts` — bulk status, removalDate, no $0 sales
- `src/app/api/admin/users/[id]/route.ts` — SEC-11 self-protection
- `src/app/api/inventory/[id]/photo/route.ts` — photo upload type+size validation

### STEP 5 — Spec conformance checks

Grade each branch against the conformance matrix (all 12 simplifications, 43 endpoints, ops config, RBAC/auth, test tiers). Record ✓/◐/✗ per cell with evidence. The matrix sections are:

- 3.1 Architecture & simplifications (BUILD_PROMPT §"KEY SIMPLIFICATIONS")
- 3.2 API surface (BUILD_PROMPT STEP 5 — 43 endpoints)
- 3.3 Config & ops (BUILD_PROMPT STEPS 2, 6, 12)
- 3.4 RBAC & auth (REQUIREMENTS §3.1, §3.7)
- 3.5 Test conformance (BUILD_PROMPT STEP 10 — 7 unit / 7 functional / 9 integration / 5 e2e)

### STEP 6 — Re-rank the cohort

After analyzing the new branch:

1. Re-number ranks 1..N across all branches (best first).
2. Rescale stars per dimension so the leader = 5★. Other branches are scaled relative to the leader (e.g. if the leader has 0 type escapes and the next has 1, the next gets 4★; if the leader has 186 tests and the next has 137, the next gets 4★ on test signal).
3. Recompute `dimensionWinners` (per-dimension leader) and the overall `recommendation` (baseline branch).
4. Record rank deltas in the re-evaluation log (which branches moved up/down).

### STEP 7 — Write `docs/BUILD_EVALUATION.md`

Write/update the report with this 11-section structure (the GitHub Pages site parses it):

```markdown
# Build Evaluation Report — Resell Inventory Manager v2

> Date: <YYYY-MM-DD>
> Scope: Evaluation of <N> AI-generated builds ...
> Method: Static source review + real npm ci / lint / tsc --noEmit / vitest run per branch.
> Re-evaluation log: <date> — added <branch>; static analysis on new branch only; rank deltas.

## 1. Executive Summary
## 2. Branch Profiles (table with one column per branch)
## 3. Spec Conformance Matrix
  ### 3.1 Architecture & simplifications
  ### 3.2 API surface
  ### 3.3 Config & ops
  ### 3.4 RBAC & auth
  ### 3.5 Test conformance
## 4. Maintainability
  ### 4.1 Type discipline
  ### 4.2 Lint outcomes
  ### 4.3 Module structure
  ### 4.4 Documentation/comments
## 5. Vulnerabilities
  ### 5.1 CSRF / Origin-Referer validation
  ### 5.2 Session invalidation
  ### 5.3 Cookie hardening
  ### 5.4 Input validation, secrets, info leakage
## 6. Complexity
## 7. Variances Between Branches
## 8. Findings by Severity
## 9. Appendix A — Methodology
  ### Raw verification results
  ### Endpoint inventory (per branch)
  ### Test files present (per branch)
## 10. Bottom Line
## 11. Re-evaluation Log
```

Every table grows a new column per new branch. The §11 re-evaluation log is appended (not overwritten) on each update.

### STEP 8 — Update `site/assets/data.js`

Update the static-analysis block in `site/assets/data.js`:

- `meta.staticEvalDate` → report date
- `profiles[]` → add a row per new branch (agent, agentVersion, model, commit, tsFiles, tsBytes, apiRoutes, pages, unit, functional, integration, e2e, asAny, colonAny, tsIgnore, middleware, lintScript, eslintConfig, npmCi, tsc, vitest, lintResult, extraDeps, nextAuth, zod, bcryptApp, sameSite)
- `rankings[]` → re-render with N entries, renumbered 1..N
- `dimensionWinners[]` → update any dimension whose leader changed
- `recommendation` → update if the baseline changed
- All spec-conformance / variance / findings / lint tables → add a key/column for the new branch

Also update the `functional` block if `docs/FUNCTIONAL_EVALUATION.md` was also updated (cross-reference).

### STEP 9 — Commit and clean up

```bash
git checkout main
git add docs/BUILD_EVALUATION.md docs/BUILD_EVAL_PROMPT.md docs/FUNCTIONAL_EVAL_PROMPT.md site/assets/data.js
git commit -m "Add <new-branch> to static eval; re-rank cohort"
# clean up worktrees (throwaway)
git worktree remove --force /tmp/opencode/eval/<branch>
# ... repeat for each branch
```

Do not push unless explicitly instructed. The site will redeploy automatically via GitHub Actions when these files land on `main`.

### STEP 10 — Done

Report back:
- The overall #1 build (baseline recommendation)
- Per-dimension winners
- Rank deltas from the re-ranking
- Confirmation that `docs/BUILD_EVALUATION.md`, `docs/BUILD_EVAL_PROMPT.md`, and `site/assets/data.js` are committed on `main`
- Any branches that failed `npm ci` or `tsc --noEmit` (with the error)

---

## END PROMPT

---

## Notes for humans

- This prompt is the static-analysis counterpart to `docs/FUNCTIONAL_EVAL_PROMPT.md`. Run this prompt first (static analysis), then run the functional prompt (E2E). Both prompts auto-discover branches and share the same ranking policy.
- It is **resumable**: if an agent is interrupted, a fresh agent can re-run from STEP 1 (worktrees are recreated idempotently) or from any later step.
- The prompt **auto-discovers** `build-*` branches via `git branch -r`, so new model/agent branches are picked up without editing this file. The only hard-coded exclusion is `build-ibm-bob` (incomplete).
- **Relative star ratings:** 5★ = current cohort leader per dimension, not an absolute bar. Adding a stronger branch rescales everyone's stars; adding a weaker branch may push existing branches down a rank.
- **No re-analysis of existing branches:** static properties (file counts, type escapes, lint results) do not change between evaluations, so only the new branch is analyzed. This differs from the functional prompt, which may re-run existing branches if the new branch raises the bar.
- The GitHub Pages site's `site/build-eval.html` automatically renders the results once `site/assets/data.js` is updated. No site rebuild needed.
- The prompt forbids patching build branches so the single one-shot-prompt fidelity of the experiment is preserved.

---

## CHANGELOG

- **2026-07-06:** Initial version. Branch-agnostic, auto-discovering, with relative star ratings and a re-evaluation log. Mirrors the structure of `docs/FUNCTIONAL_EVAL_PROMPT.md` (updated the same day).