/* eslint-disable */
// Single source of truth for the build-evaluation site.
// Extracted from docs/BUILD_EVALUATION.md (static analysis) and
// docs/FUNCTIONAL_EVALUATION.md (functional, populated by the eval prompt).
// When FUNCTIONAL_EVALUATION.md is regenerated, update the `functional` block
// per branch; the site pages render automatically.

window.EVAL_DATA = {
  meta: {
    project: 'Resell Inventory Manager v2',
    repoUrl: 'https://github.com/wildelaw/resellers-inventory-mgmt',
    promptPath: 'docs/BUILD_PROMPT.md',
    staticEvalPath: 'docs/BUILD_EVALUATION.md',
    functionalEvalPath: 'docs/FUNCTIONAL_EVALUATION.md',
    functionalPromptPath: 'docs/FUNCTIONAL_EVAL_PROMPT.md',
    staticEvalDate: '2026-06-30',
    functionalEvalDate: null, // set when FUNCTIONAL_EVALUATION.md is written
    functionalStatus: 'pending' // 'pending' | 'partial' | 'complete'
  },

  // ---------- Rankings (from BUILD_EVALUATION.md §1) ----------
  rankings: [
    { rank: 1, branch: 'build-claude-glm-5.2',         spec: 5, maintain: 5, security: 5, complexity: 4, testSignal: '23 files / 186 tests / lint exit 0' },
    { rank: 2, branch: 'build-claude-glm-5.1',         spec: 5, maintain: 5, security: 4, complexity: 4, testSignal: '14 files / 121 tests / lint exit 1 (11 err)' },
    { rank: 3, branch: 'build-opencode-glm-5.2',       spec: 4, maintain: 4, security: 5, complexity: 3, testSignal: '12 files / 134 tests / lint script broken' },
    { rank: 4, branch: 'build-vscode-glm-5.2',         spec: 4, maintain: 4, security: 4, complexity: 4, testSignal: '9 files / 100 tests / lint script broken' },
    { rank: 5, branch: 'build-opencode-1.17.4-glm-5.1', spec: 4, maintain: 3, security: 4, complexity: 4, testSignal: '14 files / 115 tests / lint exit 1 (119 err)' },
    { rank: 6, branch: 'build-pi-glm-5.1',             spec: 3, maintain: 3, security: 2, complexity: 4, testSignal: '9 files / 95 tests / lint script broken' }
  ],

  dimensionWinners: [
    { dimension: 'Spec conformance', winner: 'build-claude-glm-5.2', note: "Canonical withAuth wrapper, src/proxy.ts naming, exact 24-endpoint surface, full e2e suite, and the only branch with all 9 required integration tests. Co-winner: build-claude-glm-5.1." },
    { dimension: 'Maintainability',  winner: 'build-claude-glm-5.2', note: 'Zero as-any / :any / @ts-ignore in src/, proper NextAuth module augmentation, lint passes with zero errors and zero warnings, centralized bcrypt cost in config.ts.' },
    { dimension: 'Vulnerabilities',  winner: 'build-claude-glm-5.2', note: "Explicit sameSite:'strict', live JWT refresh of passwordChangedAt/role/canViewAll/isActive on every request, withAuth rejects deactivated accounts, defensive validateOriginOrReferer. Co-winner: build-opencode-glm-5.2." },
    { dimension: 'Complexity',       winner: 'build-opencode-1.17.4-glm-5.1', note: 'Smallest ts/tsx footprint (241 KB). Co-winner: build-pi-glm-5.1 (fewest files, 80). vscode-5.2 notable: 85 files / 268 KB with full type safety.' },
    { dimension: 'Test signal',       winner: 'build-claude-glm-5.2', note: 'Only branch with the complete 4-tier suite (7 unit + 7 functional + 9 integration + 5 e2e) and the only branch whose lint passes clean.' }
  ],

  recommendation: {
    baseline: 'build-claude-glm-5.2',
    summary: 'Most spec-faithful, fully type-safe, cleanest lint, complete test suite across all four tiers, security-hardened (explicit SameSite + live JWT refresh + isActive enforcement), canonical patterns throughout. No high- or medium-severity findings.'
  },

  // ---------- Branch profiles (§2) ----------
  profiles: [
    {
      branch: 'build-claude-glm-5.2', agent: 'Claude Code', model: 'GLM 5.2', commit: 'd951f31',
      tsFiles: 111, tsBytes: 356980, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 9, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'eslint . (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '186 pass', lintResult: 'exit 0 (0 err / 0 warn)',
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10 (centralized in config.ts)', sameSite: "explicit 'strict'"
    },
    {
      branch: 'build-claude-glm-5.1', agent: 'Claude Code', model: 'GLM 5.1', commit: '4ce31a9',
      tsFiles: 96, tsBytes: 354587, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 0, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'eslint (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '121 pass', lintResult: 'exit 1 — 11 err / 81 warn',
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '12 (inconsistent w/ seed)', sameSite: 'default'
    },
    {
      branch: 'build-opencode-1.17.4-glm-5.1', agent: 'opencode 1.17.4', model: 'GLM 5.1', commit: 'a54e68b',
      tsFiles: 95, tsBytes: 241817, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 0, e2e: 0,
      asAny: 60, colonAny: 36, tsIgnore: 0, middleware: 'src/middleware.ts (spec violation)', lintScript: 'eslint . (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '115 pass', lintResult: 'exit 1 — 119 err / 72 warn',
      extraDeps: 'uuid@^14 + @types/uuid', nextAuth: '5.0.0-beta.31', zod: '^3.25.0 (v3)', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-opencode-glm-5.2', agent: 'opencode (current)', model: 'GLM 5.2', commit: 'f4869dc',
      tsFiles: 97, tsBytes: 327706, apiRoutes: '25 (+/sales/export)', pages: 18,
      unit: 7, functional: 5, integration: 0, e2e: 0,
      asAny: 9, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '134 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: "explicit 'strict'"
    },
    {
      branch: 'build-pi-glm-5.1', agent: '"pi" agent', model: 'GLM 5.1', commit: '0e8f3b2',
      tsFiles: 80, tsBytes: 251928, apiRoutes: '22 (−/mileage/export, −/mileage/reports)', pages: 18,
      unit: 6, functional: 3, integration: 0, e2e: 0,
      asAny: 26, colonAny: 37, tsIgnore: 2, middleware: 'src/middleware.ts (spec violation)', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '95 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-vscode-glm-5.2', agent: 'VS Code (GitHub Copilot)', model: 'GLM 5.2', commit: '9e70fb6',
      tsFiles: 85, tsBytes: 267796, apiRoutes: 24, pages: 18,
      unit: 7, functional: 2, integration: 0, e2e: 1,
      asAny: 1, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '100 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-ibm-bob', agent: 'IBM build (excluded)', model: '—', commit: '—',
      tsFiles: null, tsBytes: null, apiRoutes: null, pages: null,
      unit: null, functional: null, integration: null, e2e: null,
      asAny: null, colonAny: null, tsIgnore: null, middleware: 'n/a', lintScript: 'n/a',
      eslintConfig: false, npmCi: null, tsc: null, vitest: null, lintResult: 'n/a (build incomplete)',
      extraDeps: '—', nextAuth: '—', zod: '—', bcryptApp: '—', sameSite: '—',
      note: 'Agent ran out of usage quota (lowest Pro plan) mid-build. Partial build excluded from scoring and ranking.'
    }
  ],

  // ---------- Spec conformance (§3) ----------
  conformance: {
    '3.1 Architecture & simplifications': [
      { req: '2 roles + canViewAll (no power_user)',            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: "all schema.ts: role enum ['admin','user'] + canViewAll" },
      { req: 'No CSRF token system',                            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'no csrf.ts / csrf-provider.tsx / useCsrfToken.ts in any branch' },
      { req: 'No revoked_tokens table',                         claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'all schemas: 6 tables only' },
      { req: 'No account lockout columns',                      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'no failed_login_attempts/locked_until' },
      { req: 'No in-app rate limiter',                           claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'no rate-limit.ts' },
      { req: 'Single-source profit (TS only)',                   claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'all reports/route.ts use calculateProfit; 0 SQL profit expressions' },
      { req: 'No auto $0 sales on donate/discard',               claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'all set only removalDate; no sales insert on transition' },
      { req: 'app_config single-row table',                      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'all schemas: appConfig with id default(1)' },
      { req: 'Removed tables absent',                            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'all schemas' },
      { req: 'withAuth wrapper pattern',                         claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'partial', pi51: 'partial', vscode52: 'pass', evidence: 'claude52/51, opencode17174, vscode52 use export const POST = withAuth(...); opencode52 & pi wrap inside async function POST (functionally equivalent, deviates from canonical form)' },
      { req: 'Server Components for data pages',                 claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: 'inventory/page.tsx, sales/page.tsx, reports/page.tsx, app/page.tsx' },
      { req: 'calculateSalesTaxFromPrice formula matches spec',  claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'FAIL', evidence: 'vscode52 uses price * rate (add tax) instead of price - price/(1+rate) (extract from tax-inclusive)' }
    ],
    '3.2 API surface': [
      { req: 'All 43 spec endpoints present',      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass (+1 extra /sales/export)', pi51: 'FAIL (-/mileage/export, -/mileage/reports)', vscode52: 'pass', evidence: '' },
      { req: 'Removed endpoints absent',           claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: '/api/auth/* exempt from Origin check', claude52: 'pass (also /api/setup)', claude51: 'pass', opencode17174: 'FAIL', opencode52: 'partial (no explicit exemption)', pi51: 'pass (also /api/setup POST)', vscode52: 'FAIL (no exemption)', evidence: '' }
    ],
    '3.3 Config & ops': [
      { req: 'src/proxy.ts middleware (named per spec)',   claude52: 'pass', claude51: 'pass', opencode17174: 'FAIL (src/middleware.ts)', opencode52: 'pass', pi51: 'FAIL (src/middleware.ts)', vscode52: 'pass', evidence: '' },
      { req: 'next.config.ts security headers + CSP',      claude52: 'pass (+serverExternalPackages)', claude51: 'pass', opencode17174: 'pass (+serverExternalPackages)', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'Caddyfile rate limit 5/15min auth + 100/15min api', claude52: 'pass (scoped via handle)', claude51: 'pass', opencode17174: 'pass (scoped via handle_path)', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'Dockerfile multi-stage + /data + non-root user', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'bcrypt cost factor 10 (SEC-02)',              claude52: 'pass (centralized)', claude51: 'partial (12 app, 10 seed)', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'drizzle.config.ts → ./src/lib/schema.ts',     claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'Migration .sql + meta/ journal',              claude52: 'pass', claude51: 'partial (missing meta/)', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' }
    ],
    '3.4 RBAC & auth': [
      { req: 'passwordChangedAt session invalidation (AUTH-02)', claude52: 'pass+ (live-refresh every request)', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'FAIL (broken — never written to JWT)', vscode52: 'pass', evidence: '' },
      { req: 'withAuth also rejects deactivated accounts',  claude52: 'pass', claude51: 'FAIL', opencode17174: 'FAIL', opencode52: 'FAIL', pi51: 'FAIL', vscode52: 'FAIL', evidence: '' },
      { req: 'SEC-11 admin cannot deactivate/role-change own account', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'USR-02 password policy (8–128 + 4 char classes)', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', evidence: '' },
      { req: 'SameSite=Strict cookie (SEC-01)',            claude52: 'pass (explicit)', claude51: 'partial (default)', opencode17174: 'partial (default)', opencode52: 'pass (explicit)', pi51: 'partial (default)', vscode52: 'partial (default)', evidence: '' }
    ],
    '3.5 Test conformance': [
      { req: '7 unit tests',        claude52: '7', claude51: '7', opencode17174: '7', opencode52: '7', pi51: '6', vscode52: '7', evidence: '' },
      { req: '7 functional tests',   claude52: '7', claude51: '7', opencode17174: '7', opencode52: '5', pi51: '3', vscode52: '2 (missing 5: password-invalidation, setup-lock, sale-refund-flow, inventory-removal-date, refund-impact)', evidence: '' },
      { req: '9 integration tests', claude52: '9', claude51: '0', opencode17174: '0', opencode52: '0', pi51: '0', vscode52: '0', evidence: '' },
      { req: '5 e2e specs',         claude52: '5', claude51: '5', opencode17174: '0', opencode52: '0', pi51: '0', vscode52: '1 (auth only)', evidence: '' }
    ]
  },

  // ---------- Type discipline (§4.1) ----------
  typeDiscipline: [
    { branch: 'build-claude-glm-5.2',          asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-claude-glm-5.1',          asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-vscode-glm-5.2',          asAny: 1,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 1 },
    { branch: 'build-opencode-glm-5.2',        asAny: 9,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 9 },
    { branch: 'build-pi-glm-5.1',              asAny: 26, colonAny: 37, anyGeneric: 10, tsIgnore: 2, total: 75 },
    { branch: 'build-opencode-1.17.4-glm-5.1', asAny: 60, colonAny: 36, anyGeneric: 1, tsIgnore: 0, total: 97 }
  ],

  // ---------- Lint outcomes (§4.2) ----------
  lintOutcomes: [
    { branch: 'build-claude-glm-5.2',          command: 'eslint .',  result: 'exit 0 — 0 errors, 0 warnings' },
    { branch: 'build-claude-glm-5.1',          command: 'eslint',    result: 'exit 1 — 11 errors, 81 warnings (all errors are no-explicit-any in test files)' },
    { branch: 'build-opencode-1.17.4-glm-5.1', command: 'eslint .',  result: 'exit 1 — 119 errors, 72 warnings (errors spread across src/ and tests)' },
    { branch: 'build-opencode-glm-5.2',        command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' },
    { branch: 'build-pi-glm-5.1',               command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' },
    { branch: 'build-vscode-glm-5.2',           command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' }
  ],

  // ---------- Complexity (§6) ----------
  complexity: [
    { branch: 'build-opencode-1.17.4-glm-5.1', tsBytes: 241817, files: 95,  largestModule: 'schema.ts ~5 KB',         extraModules: '0 (tightest)' },
    { branch: 'build-pi-glm-5.1',              tsBytes: 251928, files: 80,  largestModule: 'auth.ts ~4 KB',          extraModules: '0' },
    { branch: 'build-vscode-glm-5.2',           tsBytes: 267796, files: 85,  largestModule: 'reports/route.ts 104 lines', extraModules: '0' },
    { branch: 'build-opencode-glm-5.2',        tsBytes: 327706, files: 97,  largestModule: 'inventory-queries.ts 3.8 KB + sales-queries.ts', extraModules: '+4 (http-utils, inventory-queries, sales-queries, rbac)' },
    { branch: 'build-claude-glm-5.1',          tsBytes: 354587, files: 96,  largestModule: 'reports/route.ts 99 lines', extraModules: '0' },
    { branch: 'build-claude-glm-5.2',          tsBytes: 356980, files: 111, largestModule: 'reports/route.ts 112 lines', extraModules: '+4 (api-client, inventory-logic, app-shell, client-shell)' }
  ],

  // ---------- Findings by severity (§8) ----------
  findings: [
    { sev: 'High',   branch: 'build-pi-glm-5.1',                           finding: 'passwordChangedAt never written to JWT → session invalidation always no-ops (AUTH-02/SEC-03 broken)', location: 'src/lib/auth.ts:90-97' },
    { sev: 'High',   branch: 'build-opencode-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2', finding: "lint script uses removed next lint; no eslint.config.mjs; lint pipeline non-functional", location: 'package.json scripts' },
    { sev: 'Med',    branch: 'build-vscode-glm-5.2',                       finding: "calculateSalesTaxFromPrice uses price * rate instead of spec's price - price/(1+rate) (SALE-04 deviation)", location: 'src/lib/financial.ts:48' },
    { sev: 'Med',    branch: 'build-opencode-1.17.4-glm-5.1, build-opencode-glm-5.2, build-vscode-glm-5.2', finding: 'validateOriginOrReferer does not exempt /api/auth/* (AUTH-04 deviation)', location: 'src/lib/api-utils.ts / http-utils.ts' },
    { sev: 'Med',    branch: 'build-claude-glm-5.1, build-opencode-1.17.4-glm-5.1, build-pi-glm-5.1, build-vscode-glm-5.2', finding: 'No explicit SameSite=Strict on session cookie (relies on NextAuth default lax)', location: 'src/lib/auth.ts' },
    { sev: 'Med',    branch: 'build-pi-glm-5.1',                           finding: 'Missing /api/mileage/export and /api/mileage/reports endpoints (MILE-02, MILE-03)', location: 'src/app/api/mileage/' },
    { sev: 'Med',    branch: 'claude-5.1, opencode-1.17.4-5.1, opencode-5.2, pi-5.1, vscode-5.2', finding: 'No integration tests produced (spec requires 9 under tests/integration/api/)', location: 'tests/integration/ absent' },
    { sev: 'Med',    branch: 'build-vscode-glm-5.2',                       finding: 'Only 2 of 7 required functional tests (missing password-invalidation, setup-lock, sale-refund-flow, inventory-removal-date, refund-impact)', location: 'tests/functional/' },
    { sev: 'Low',    branch: 'build-opencode-1.17.4-glm-5.1, build-pi-glm-5.1', finding: 'Middleware named src/middleware.ts not src/proxy.ts (BUILD_PROMPT STEP 6)', location: 'src/' },
    { sev: 'Low',    branch: 'build-claude-glm-5.1',                       finding: 'Migration directory lacks meta/_journal.json (only .sql); may break drizzle-kit migrate', location: 'drizzle/' },
    { sev: 'Low',    branch: 'build-claude-glm-5.1',                       finding: 'bcrypt cost 12 in app code, 10 in seed (inconsistent; both ≥ spec)', location: 'src/app/api/*/route.ts, src/scripts/seed.ts' },
    { sev: 'Low',    branch: 'build-opencode-1.17.4-glm-5.1',              finding: 'zod v3 pinned while spec ecosystem is v4; 97 type-escape occurrences in src/', location: 'package.json, src/lib/auth.ts' },
    { sev: 'Low',    branch: 'build-opencode-1.17.4-glm-5.1',              finding: 'Adds uuid@^14 dependency not used by core id flow', location: 'package.json' },
    { sev: 'Low',    branch: 'build-vscode-glm-5.2',                       finding: 'Only 1 of 5 required e2e specs (auth only; missing inventory, sales, rbac, import)', location: 'tests/e2e/' },
    { sev: 'Low',    branch: 'build-vscode-glm-5.2',                       finding: 'Schema imports check from drizzle-orm but never uses it (dead import)', location: 'src/lib/schema.ts:1' },
    { sev: 'Info',   branch: 'build-claude-glm-5.2',                       finding: 'Extra modules api-client, inventory-logic, app-shell, client-shell (well-scoped refinements, spec-list deviation)', location: 'src/lib/, src/components/' },
    { sev: 'Info',   branch: 'build-opencode-glm-5.2',                    finding: 'Extra modules http-utils, inventory-queries, sales-queries, rbac (cleaner separation, spec-list deviation)', location: 'src/lib/' },
    { sev: 'Info',   branch: 'build-pi-glm-5.1',                           finding: '13 console.log in src/ (highest density)', location: 'various' },
    { sev: 'Info',   branch: 'build-vscode-glm-5.2',                       finding: '1 as any in db.ts Proxy pattern (pragmatic escape for dynamic property forwarding)', location: 'src/lib/db.ts:43' }
  ],

  // ---------- Raw verification (Appendix A) ----------
  rawVerification: [
    { branch: 'build-claude-glm-5.2',          npmCi: 'exit 0', lint: 'exit 0 — 0 err / 0 warn',       tsc: 'exit 0 (clean)', vitest: 'exit 0 — 23 files, 186 tests' },
    { branch: 'build-claude-glm-5.1',          npmCi: 'exit 0', lint: 'exit 1 — 11 err / 81 warn',     tsc: 'exit 0 (clean)', vitest: 'exit 0 — 14 files, 121 tests' },
    { branch: 'build-opencode-1.17.4-glm-5.1', npmCi: 'exit 0', lint: 'exit 1 — 119 err / 72 warn',   tsc: 'exit 0 (clean)', vitest: 'exit 0 — 14 files, 115 tests' },
    { branch: 'build-opencode-glm-5.2',        npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 12 files, 134 tests' },
    { branch: 'build-pi-glm-5.1',              npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 9 files, 95 tests' },
    { branch: 'build-vscode-glm-5.2',          npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 9 files, 100 tests' }
  ],

  // ---------- Variances between branches (§7) — key dimensions ----------
  variances: [
    { dimension: 'withAuth signature', claude52: 'export const POST = withAuth(...) — matches spec', claude51: 'same as claude-5.2', opencode17174: 'same as claude-5.2', opencode52: 'wraps inside async function POST', pi51: 'withAuth(req, handler) — different signature', vscode52: 'export const POST = withAuth(...) — matches spec' },
    { dimension: 'Middleware filename', claude52: 'src/proxy.ts (spec)', claude51: 'src/proxy.ts (spec)', opencode17174: 'src/middleware.ts (Next.js)', opencode52: 'src/proxy.ts (spec)', pi51: 'src/middleware.ts (Next.js)', vscode52: 'src/proxy.ts (spec)' },
    { dimension: 'lint script', claude52: 'eslint . (works, clean)', claude51: 'eslint (works)', opencode17174: 'eslint . (works)', opencode52: 'next lint (broken)', pi51: 'next lint (broken)', vscode52: 'next lint (broken)' },
    { dimension: 'eslint.config.mjs', claude52: 'yes', claude51: 'yes', opencode17174: 'yes', opencode52: 'no', pi51: 'no', vscode52: 'no' },
    { dimension: 'Schema timestamp mode', claude52: 'raw integer (unix s)', claude51: 'raw integer (unix s)', opencode17174: "{ mode: 'timestamp' } (Date)", opencode52: 'raw integer (unix s)', pi51: 'raw integer (unix s)', vscode52: 'raw integer (unix s)' },
    { dimension: 'Schema boolean mode', claude52: 'raw 0/1 + toBool/fromBool helpers', claude51: 'raw 0/1 integer', opencode17174: "{ mode: 'boolean' }", opencode52: "{ mode: 'boolean' }", pi51: 'raw 0/1 integer', vscode52: 'raw 0/1 integer' },
    { dimension: 'JWT callback refreshes live fields from DB', claude52: 'every request', claude51: 'login-only', opencode17174: 'login-only', opencode52: 'login-only', pi51: 'login-only (broken)', vscode52: 'login-only' },
    { dimension: 'withAuth rejects deactivated accounts', claude52: 'yes', claude51: 'no', opencode17174: 'no', opencode52: 'no', pi51: 'no', vscode52: 'no' },
    { dimension: 'calculateSalesTaxFromPrice formula', claude52: 'spec: price - price/(1+rate)', claude51: 'same', opencode17174: 'same', opencode52: 'same', pi51: 'same', vscode52: 'differs: price * rate (adds tax, not extracts)' },
    { dimension: 'NextAuth module augmentation', claude52: 'next-auth + @auth/core/jwt', claude51: 'next-auth + @auth/core/jwt', opencode17174: 'next-auth only', opencode52: 'next-auth only', pi51: 'none (uses as any)', vscode52: 'next-auth + @auth/core/jwt' },
    { dimension: 'Extra dependency', claude52: '—', claude51: '—', opencode17174: 'uuid@^14 + @types/uuid', opencode52: '—', pi51: '—', vscode52: '—' },
    { dimension: 'zod version', claude52: 'v4', claude51: 'v4', opencode17174: 'v3', opencode52: 'v4', pi51: 'v4', vscode52: 'v4' },
    { dimension: 'Extra API endpoint', claude52: '—', claude51: '—', opencode17174: '—', opencode52: '+ /api/sales/export', pi51: '—', vscode52: '—' },
    { dimension: 'Missing API endpoints', claude52: '—', claude51: '—', opencode17174: '—', opencode52: '—', pi51: '- /mileage/export, - /mileage/reports', vscode52: '—' },
    { dimension: 'Migration meta/ journal', claude52: 'yes', claude51: 'no (missing)', opencode17174: 'yes', opencode52: 'yes', pi51: 'yes', vscode52: 'yes' },
    { dimension: 'bcrypt cost (app code)', claude52: '10 (centralized in config.ts)', claude51: '12 (inconsistent w/ seed)', opencode17174: '10', opencode52: '10', pi51: '10', vscode52: '10' },
    { dimension: 'SameSite cookie config', claude52: "explicit 'strict'", claude51: 'default', opencode17174: 'default', opencode52: "explicit 'strict'", pi51: 'default', vscode52: 'default' },
    { dimension: 'serverExternalPackages in next.config', claude52: 'yes', claude51: 'no', opencode17174: 'yes', opencode52: 'no', pi51: 'no', vscode52: 'no' },
    { dimension: 'Caddyfile rate-limit scoping', claude52: 'scoped via handle /api/auth/*', claude51: 'global zones', opencode17174: 'scoped via handle_path /api/auth/*', opencode52: 'global zones', pi51: 'global zones', vscode52: 'global zones' },
    { dimension: 'Extra modules (beyond spec list)', claude52: 'api-client, inventory-logic, app-shell, client-shell', claude51: '0', opencode17174: '0', opencode52: 'http-utils, inventory-queries, sales-queries, rbac', pi51: '0', vscode52: '0' }
  ],

  // ---------- Spec docs (for the specs overview page) ----------
  specDocs: [
    { name: 'REQUIREMENTS.md',      path: 'docs/REQUIREMENTS.md',      blurb: 'What to build (simplified v2 requirements)' },
    { name: 'ARCHITECTURE.md',      path: 'docs/ARCHITECTURE.md',      blurb: 'How it is structured (simplified schema, auth, API)' },
    { name: 'DESIGN.md',            path: 'docs/DESIGN.md',            blurb: 'How each feature works (simplified flows, RBAC, CSRF)' },
    { name: 'IMPLEMENTATION.md',   path: 'docs/IMPLEMENTATION.md',     blurb: 'How to write the code (configs, patterns, route wrapper)' },
    { name: 'API_REFERENCE.md',    path: 'docs/API_REFERENCE.md',     blurb: 'Every endpoint (updated for v2)' },
    { name: 'UI_SPECIFICATION.md',  path: 'docs/UI_SPECIFICATION.md',   blurb: 'Every page (simplified, no CsrfProvider)' },
    { name: 'OPERATIONS.md',        path: 'docs/OPERATIONS.md',         blurb: 'Deployment, backup, monitoring (Caddy rate limiting)' },
    { name: 'TEST_STRATEGY.md',     path: 'docs/TEST_STRATEGY.md',     blurb: 'What tests to write (updated for v2)' },
    { name: 'THREAT_MODEL.md',      path: 'docs/THREAT_MODEL.md',      blurb: 'Threat model for the v2 architecture' },
    { name: 'BUILD_PROMPT.md',      path: 'docs/BUILD_PROMPT.md',      blurb: 'The one-shot prompt fed to all coding agents' },
    { name: 'BUILD_EVALUATION.md',  path: 'docs/BUILD_EVALUATION.md',  blurb: 'Static analysis results across all builds' },
    { name: 'FUNCTIONAL_EVAL_PROMPT.md', path: 'docs/FUNCTIONAL_EVAL_PROMPT.md', blurb: 'Reusable prompt that drives the functional E2E evaluation' },
    { name: 'FUNCTIONAL_EVALUATION.md',   path: 'docs/FUNCTIONAL_EVALUATION.md',   blurb: 'Functional E2E test results across all builds (populated by the prompt above)' }
  ],

  // ---------- Functional evaluation (populated by docs/FUNCTIONAL_EVAL_PROMPT.md) ----------
  // The 5 Playwright E2E spec flows from TEST_STRATEGY.md §2.4
  // plus 18 regression scenarios from §4.1 used as in-flow assertions.
  e2eFlows: [
    { id: 'auth',      file: 'auth.spec.ts',      blurb: 'Login flow, logout, redirect to login when unauthenticated' },
    { id: 'inventory', file: 'inventory.spec.ts', blurb: 'CRUD operations for inventory items' },
    { id: 'sales',     file: 'sales.spec.ts',     blurb: 'Sale creation and refund workflow' },
    { id: 'import',    file: 'import.spec.ts',    blurb: 'CSV upload workflow for inventory and sales' },
    { id: 'rbac',      file: 'rbac.spec.ts',      blurb: 'Role-based access: user sees own data, canViewAll user sees all, admin can manage' }
  ],

  regressionScenarios: [
    { id: 'REG-01', scenario: 'Create item → record sale → item status becomes "sold"',                       category: 'Functional', priority: 'Critical' },
    { id: 'REG-02', scenario: 'Record sale → process refund_with_return → item becomes "returned"',             category: 'Functional', priority: 'Critical' },
    { id: 'REG-03', scenario: 'Record sale → process refund_no_return → item stays "sold", refund recorded',   category: 'Functional', priority: 'Critical' },
    { id: 'REG-04', scenario: 'Delete sale → item status reverts to "available"',                              category: 'Functional', priority: 'Critical' },
    { id: 'REG-05', scenario: 'Bulk update items to "donated" → removalDate set, no $0 sales created',          category: 'Functional', priority: 'Critical' },
    { id: 'REG-06', scenario: 'Password change invalidates existing JWT sessions',                             category: 'Auth',      priority: 'Critical' },
    { id: 'REG-07', scenario: 'Origin header required on all POST/PUT/DELETE/PATCH requests',                   category: 'Security',  priority: 'Critical' },
    { id: 'REG-08', scenario: 'Origin header mismatched returns 403 INVALID_ORIGIN',                            category: 'Security',  priority: 'Critical' },
    { id: 'REG-09', scenario: 'Standard user cannot access another user is items',                              category: 'RBAC',      priority: 'Critical' },
    { id: 'REG-10', scenario: 'canViewAll user can view all data but only edit own',                            category: 'RBAC',      priority: 'Critical' },
    { id: 'REG-11', scenario: 'Admin can manage users and edit any data',                                      category: 'RBAC',      priority: 'Critical' },
    { id: 'REG-12', scenario: 'Invalid status transition rejected (e.g., sold → available)',                     category: 'Validation',priority: 'Critical' },
    { id: 'REG-13', scenario: 'Status transition to "donated" sets removalDate',                               category: 'Business Logic', priority: 'High' },
    { id: 'REG-14', scenario: 'Status transition "returned" → "available" clears removalDate',                  category: 'Business Logic', priority: 'High' },
    { id: 'REG-15', scenario: 'Backup restore with invalid data → no DB changes',                               category: 'Backup',    priority: 'High' },
    { id: 'REG-16', scenario: 'Setup lock prevents second admin creation',                                      category: 'Auth',      priority: 'High' },
    { id: 'REG-17', scenario: 'Photo upload requires item ownership',                                           category: 'Security',  priority: 'High' },
    { id: 'REG-18', scenario: 'Profit calculation produces correct results for all null/zero combinations',     category: 'Financial', priority: 'High' }
  ],

  // Populated by docs/FUNCTIONAL_EVAL_PROMPT.md execution.
  // Each branch gets: bootMode, flows[{id, status, attempts, error}],
  // regressions[{id, status}], failures[{flowId, scenarioId, error, effort, prompt}],
  // functionalScore (0-100), summary.
  functional: {
    status: 'pending', // 'pending' | 'partial' | 'complete'
    dateCompleted: null,
    methodology: null,
    branches: {
      'build-claude-glm-5.2':          { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null },
      'build-claude-glm-5.1':          { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null },
      'build-opencode-1.17.4-glm-5.1': { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null },
      'build-opencode-glm-5.2':       { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null },
      'build-pi-glm-5.1':             { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null },
      'build-vscode-glm-5.2':         { bootMode: null, flows: [], regressions: [], failures: [], functionalScore: null, summary: null }
    },
    crossBranchMatrix: null, // populated when complete
    aggregateFindings: null,
    effortSummary: null,
    functionalWinner: null,
    recommendation: null,
    appendix: null
  }
};