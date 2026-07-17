/* Stores the functional-eval prompt text for the prompt-functional-eval.html page.
   Kept in sync with docs/FUNCTIONAL_EVAL_PROMPT.md (the canonical source). */
window.FUNCTIONAL_PROMPT_TEXT = `You are a coding agent. Your task is to run a full functional end-to-end evaluation of all completed builds of the Resell Inventory Manager v2 application and write the results to docs/FUNCTIONAL_EVALUATION.md. You must also update site/assets/data.js so the GitHub Pages site renders the results.

### Read first (in this order, completely)

1. docs/REQUIREMENTS.md — what the app does
2. docs/TEST_STRATEGY.md — the canonical test matrix (this is your rubric)
3. docs/API_REFERENCE.md — every endpoint you will exercise
4. docs/UI_SPECIFICATION.md — the pages you will drive with Playwright
5. docs/OPERATIONS.md — how to boot the app (Docker Compose + Caddy)
6. docs/BUILD_EVALUATION.md — the static analysis already done (read only; do not modify)

### Scope

Evaluate the nine completed build branches:

- build-claude-glm-5.2
- build-claude-glm-5.1
- build-opencode-glm-5.1
- build-opencode-glm-5.2
- build-pi-glm-5.1
- build-vscode-glm-5.2
- build-pi-glm-5.2
- build-codex-glm-5.2
- build-opencode-minimax-m3

Exclude build-ibm-bob — it did not complete. Do not evaluate it.

### Fidelity rules (critical)

1. Do not patch any build branch. Branches are preserved as single one-shot-prompt artifacts. If a build fails a flow because of a real bug, that is the result — record it.
2. Do not commit anything to any build branch. Only commit two files on main at the end: docs/FUNCTIONAL_EVALUATION.md and site/assets/data.js.
3. You may write Playwright spec files into a worktree if the branch is missing them (common — most branches ship zero or one e2e specs). Use the canonical specs from docs/TEST_STRATEGY.md §2.4. These in-worktree specs are throwaway — do not commit them.
4. Do not modify any spec doc (docs/*.md) other than writing docs/FUNCTIONAL_EVALUATION.md.

### STEP 1 — Prepare worktrees

For each of the nine branches, create an isolated git worktree:

    mkdir -p /tmp/opencode/eval-func
    for b in build-claude-glm-5.2 build-claude-glm-5.1 build-opencode-glm-5.1 build-opencode-glm-5.2 build-pi-glm-5.1 build-vscode-glm-5.2 build-pi-glm-5.2 build-codex-glm-5.2 build-opencode-minimax-m3; do
      git worktree add /tmp/opencode/eval-func/$b $b
    done

### STEP 2 — Boot each build

Preferred (real Caddy TLS + rate limiting + /data volume, per docs/OPERATIONS.md):

    cd /tmp/opencode/eval-func/$b
    npm ci --no-audit --no-fund
    docker compose --profile https build
    docker compose --profile https up -d
    # wait for /api/health on the proxied port (usually https://localhost:443)

Fallback if Docker is unavailable:

    npm ci --no-audit --no-fund
    npm run dev &            # background dev server
    sleep 8
    npx tsx src/scripts/seed.ts   # seed admin + sample data per docs/OPERATIONS.md
    # verify: curl -s http://localhost:3000/api/health

Record the boot mode used (docker or dev) per branch in §2 of the report. If a build fails to boot, record the error and skip E2E for that branch — but still include it in the report with all flows marked fail and the boot error in the methodology.

### STEP 3 — Install Playwright (if missing)

    cd /tmp/opencode/eval-func/$b
    npx playwright install --with-deps chromium

If the branch has no playwright.config.ts, create one in the worktree (throwaway) with baseURL: http://localhost:3000 (or the proxied URL for Docker). Do not commit it.

### STEP 4 — Ensure the 5 canonical E2E spec files exist

The 5 spec files required by docs/TEST_STRATEGY.md §2.4 are:

- tests/e2e/auth.spec.ts — login flow, logout, redirect to login when unauthenticated
- tests/e2e/inventory.spec.ts — CRUD operations for inventory items
- tests/e2e/sales.spec.ts — sale creation and refund workflow
- tests/e2e/import.spec.ts — CSV upload workflow for inventory and sales
- tests/e2e/rbac.spec.ts — role-based access: user sees own data, canViewAll user sees all, admin can manage

For each worktree:

1. Check which of these files exist.
2. For any missing file, write it from the spec described in TEST_STRATEGY.md. Use the seeded users from src/scripts/seed.ts (admin@example.com / user@example.com — read the seed script to get the real passwords). These in-worktree specs are throwaway and must not be committed.
3. Inside each spec file, also assert the relevant regression scenarios from TEST_STRATEGY.md §4.1 (REG-01..REG-18). Map each regression scenario to the flow that exercises it:
   - auth.spec.ts        → REG-06, REG-07, REG-08, REG-16
   - inventory.spec.ts   → REG-05, REG-12, REG-13, REG-14, REG-17
   - sales.spec.ts       → REG-01, REG-02, REG-03, REG-04, REG-18
   - import.spec.ts      → (no REG scenarios; covered functionally)
   - rbac.spec.ts        → REG-09, REG-10, REG-11
   - REG-15 (backup restore with invalid data) is exercised via an API call inside any spec; pick rbac.spec.ts for it.

### STEP 5 — Run the E2E evaluation

For each worktree, run all 5 spec files:

    cd /tmp/opencode/eval-func/$b
    npx playwright test --reporter=line --output=/tmp/opencode/eval-func/$b/results

Run each flow 3 times to surface flakiness. Record per flow:
- pass if all 3 runs pass
- fail if all 3 runs fail (record the error message from the first failure)
- flaky if results are mixed (record the failure rate, e.g. flaky (2/3 pass))

Caddy rate-limit 429 responses are expected on auth flows under repeated runs. Record a 429 as info, not a failure — wait 15 minutes or reduce the retry count for that flow if 429s dominate.

### STEP 6 — Record per-scenario results

For each of the 18 regression scenarios (REG-01..REG-18), record per branch:
- pass / fail / flaky
- If fail or flaky: the error message and the failing file:line if available

### STEP 7 — Produce effort estimates and remediation prompts

For each failing scenario per branch, produce:

1. Effort estimate using these bands:
   - S — < 15 minutes (trivial fix: typo, missing import, one-line config)
   - M — < 60 minutes (small fix: adjust a helper, add a missing test, fix a validation)
   - L — < 240 minutes (substantial: rewrite a flow, fix a broken auth path)
   - XL — > 240 minutes (architectural: missing module, spec deviation requiring restructure)
2. A targeted AI remediation prompt (≤ 300 characters) that references the failing file/function and the relevant spec section. Format:

   Fix <file>:<function> per <spec-section>: <one-sentence description of the required change>.

Example:

   Fix src/lib/financial.ts:calculateSalesTaxFromPrice per SALE-04: use price - price/(1+rate) to extract tax from a tax-inclusive price, not price * rate.

### STEP 8 — Write docs/FUNCTIONAL_EVALUATION.md

Write the report with exactly this structure (the GitHub Pages site parses it):

    # Functional Evaluation Report — Resell Inventory Manager v2

    > Date: <YYYY-MM-DD>
    > Scope: Playwright E2E evaluation of 6 completed builds against docs/TEST_STRATEGY.md.
    > Methodology: isolated git worktrees, Docker Compose boot (or npm run dev fallback), Playwright chromium, 3 retries per flow.

    ## 1. Executive Summary
    <2-4 paragraphs: overall functional winner, biggest shared gaps, notable per-branch surprises.>

    ## 2. Methodology
    - Playwright version: <version>
    - Node version: <version>
    - Boot modes per branch:
      | Branch | Boot mode | Notes |
      |---|---|---|
      | build-claude-glm-5.2 | docker | ... |
    - Retry count: 3 per flow
    - Caddy 429 handling: recorded as info, not failure

    ## 3. Per-Branch Results

    ### 3.1 build-claude-glm-5.2
    **Boot:** docker · **Functional score:** NN/100

    #### E2E flow results
    | Flow | Status | Attempts | Error |
    |---|---|---|---|
    | auth | pass | 3/3 | — |

    #### Regression scenarios
    | ID | Scenario | Status | Error |
    |---|---|---|---|
    | REG-01 | ... | pass | — |

    #### Failures & remediation
    | Flow / scenario | Error | Effort | Remediation prompt |
    |---|---|---|---|
    | sales / REG-02 | ... | M | Fix ... |

    **Summary:** <one paragraph for this branch>

    (repeat §3.2..3.6 for each remaining completed branch, in this order: build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2)

    ## 4. Cross-Branch Comparison Matrix

    ### 4.1 E2E flows
    | Flow | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.1 | vscode-5.2 |
    |---|---|---|---|---|---|---|
    | auth | pass | pass | ... | ... | ... | ... |

    ### 4.2 Regression scenarios (REG-01..REG-18)
    | ID | claude-5.2 | claude-5.1 | opencode-5.1 | opencode-5.2 | pi-5.1 | vscode-5.2 |
    |---|---|---|---|---|---|---|
    | REG-01 | pass | pass | ... | ... | ... | ... |

    ## 5. Aggregate Findings & Severity
    | Sev | Branch | Finding | Flow | Scenario |
    |---|---|---|---|---|

    ## 6. Effort Estimates Summary
    | Branch | Total failures | S | M | L | XL | Estimated hours |
    |---|---|---|---|---|---|---|

    ## 7. Remediation Prompts (indexed)
    1. Fix src/lib/financial.ts:calculateSalesTaxFromPrice per SALE-04: ... — build-vscode-glm-5.2 (sales / REG-18)

    ## 8. Functional Winner & Recommendation
    **Functional winner:** <branch>
    **Recommendation:** <one paragraph>

    ## Appendix
    - Raw Playwright reports: /tmp/opencode/eval-func/<branch>/results/
    - Playwright config: <inline or path>
    - Seed commands: npx tsx src/scripts/seed.ts (per docs/OPERATIONS.md)

### STEP 9 — Update site/assets/data.js

Update the functional block in site/assets/data.js so the site renders the results. Set:

- meta.functionalEvalDate to the report date
- meta.functionalStatus to 'complete' (or 'partial' if some branches were not evaluated)
- functional.status to 'complete' (or 'partial')
- functional.dateCompleted to the report date
- functional.methodology to a short string summarizing boot modes + Playwright version
- functional.branches[<branch>] for each branch with: bootMode, flows (array of {id, status, attempts, error}), regressions (array of {id, scenario, category, priority, status, error}), failures (array of {flowId, scenarioId, error, effort, prompt}), functionalScore (0-100, computed as passes/total * 100), and summary (one paragraph)
- functional.aggregateFindings (array of {sev, branch, finding, flowId, scenarioId})
- functional.effortSummary (array of {branch, total, S, M, L, XL, estimatedHours})
- functional.functionalWinner (branch name)
- functional.recommendation (string)
- functional.appendix (optional string)

### STEP 10 — Commit and clean up

    git checkout main
    git add docs/FUNCTIONAL_EVALUATION.md site/assets/data.js
    git commit -m "Add FUNCTIONAL_EVALUATION.md and update site data with E2E results"
    # clean up worktrees (throwaway)
    git worktree remove --force /tmp/opencode/eval-func/build-claude-glm-5.2
    # ... repeat for each branch

Do not push unless explicitly instructed. The site will redeploy automatically via GitHub Actions when these two files land on main.

### STEP 11 — Done

Report back:
- The functional winner
- Total failures per branch
- Total estimated remediation hours across all branches
- Confirmation that docs/FUNCTIONAL_EVALUATION.md and site/assets/data.js are committed on main
- Any branches that could not be booted (with the boot error)`;