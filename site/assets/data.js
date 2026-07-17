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
    staticEvalDate: '2026-07-16',
    functionalEvalDate: '2026-07-16', // set when FUNCTIONAL_EVALUATION.md is written
    functionalStatus: 'complete' // 'pending' | 'partial' | 'complete'
  },

  // ---------- Rankings (from BUILD_EVALUATION.md §1) ----------
  rankings: [
    { rank: 1, branch: 'build-claude-glm-5.2',         spec: 5, maintain: 5, security: 5, complexity: 4, testSignal: '23 files / 186 tests / lint exit 0' },
    { rank: 2, branch: 'build-claude-glm-5.1',         spec: 5, maintain: 5, security: 4, complexity: 4, testSignal: '14 files / 121 tests / lint exit 1 (11 err)' },
    { rank: 3, branch: 'build-opencode-minimax-m3',    spec: 4, maintain: 4, security: 3, complexity: 4, testSignal: '15 files / 135 tests / lint script broken' },
    { rank: 4, branch: 'build-opencode-glm-5.2',       spec: 4, maintain: 4, security: 5, complexity: 3, testSignal: '12 files / 134 tests / lint script broken' },
    { rank: 5, branch: 'build-pi-glm-5.2',             spec: 4, maintain: 3, security: 4, complexity: 5, testSignal: '14 files / 137 tests / lint script broken' },
    { rank: 6, branch: 'build-vscode-glm-5.2',         spec: 4, maintain: 4, security: 4, complexity: 4, testSignal: '9 files / 100 tests / lint script broken' },
    { rank: 7, branch: 'build-opencode-glm-5.1', spec: 4, maintain: 3, security: 4, complexity: 4, testSignal: '14 files / 115 tests / lint exit 1 (119 err)' },
    { rank: 8, branch: 'build-pi-glm-5.1',             spec: 3, maintain: 3, security: 2, complexity: 4, testSignal: '9 files / 95 tests / lint script broken' },
    { rank: 9, branch: 'build-codex-glm-5.2',          spec: 4, maintain: 2, security: 3, complexity: 5, testSignal: '7 files (77 pass / 16 fail) / tsc exit 1 (101 err) / lint script broken' }
  ],

  dimensionWinners: [
    { dimension: 'Spec conformance', winner: 'build-claude-glm-5.2', note: "Canonical withAuth wrapper, src/proxy.ts naming, exact 24-endpoint surface, full e2e suite, and the only branch with all 9 required integration tests. Co-winner: build-claude-glm-5.1." },
    { dimension: 'Maintainability',  winner: 'build-claude-glm-5.2', note: 'Zero as-any / :any / @ts-ignore in src/, proper NextAuth module augmentation, lint passes with zero errors and zero warnings, centralized bcrypt cost in config.ts.' },
    { dimension: 'Vulnerabilities',  winner: 'build-claude-glm-5.2', note: "Explicit sameSite:'strict', live JWT refresh of passwordChangedAt/role/canViewAll/isActive on every request, withAuth rejects deactivated accounts, defensive validateOriginOrReferer. Co-winner: build-opencode-glm-5.2." },
    { dimension: 'Complexity',       winner: 'build-codex-glm-5.2', note: 'Smallest byte total in the cohort (230 KB). Co-winner: build-pi-glm-5.2 (fewest files among compiling builds — 72, third-smallest bytes — 282 KB) and build-opencode-glm-5.1 (second-smallest bytes — 242 KB). Note: codex-5.2 footprint win discounted in overall rank by tsc/vitest failures. vscode-5.2 notable: 85 files / 268 KB with near-full type safety.' },
    { dimension: 'Test signal',       winner: 'build-claude-glm-5.2', note: 'Only branch with the complete 4-tier suite (7 unit + 7 functional + 9 integration + 5 e2e) and the only branch whose lint passes clean.' }
  ],

  recommendation: {
    baseline: 'build-claude-glm-5.2',
    summary: 'Most spec-faithful, fully type-safe, cleanest lint, complete test suite across all four tiers, security-hardened (explicit SameSite + live JWT refresh + isActive enforcement), canonical patterns throughout. No high- or medium-severity findings.'
  },

  // ---------- Branch profiles (§2) ----------
  profiles: [
    {
      branch: 'build-claude-glm-5.2', agent: 'Claude Code', agentVersion: '2.1.196', model: 'GLM 5.2', commit: 'd951f31',
      tsFiles: 111, tsBytes: 356980, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 9, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'eslint . (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '186 pass', lintResult: 'exit 0 (0 err / 0 warn)',
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10 (centralized in config.ts)', sameSite: "explicit 'strict'"
    },
    {
      branch: 'build-claude-glm-5.1', agent: 'Claude Code', agentVersion: '2.1.176', model: 'GLM 5.1', commit: '4ce31a9',
      tsFiles: 96, tsBytes: 354587, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 0, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'eslint (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '121 pass', lintResult: 'exit 1 — 11 err / 81 warn',
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '12 (inconsistent w/ seed)', sameSite: 'default'
    },
    {
      branch: 'build-opencode-minimax-m3', agent: 'opencode', agentVersion: '1.18.3', model: 'MiniMax M3', commit: 'de890ab',
      tsFiles: 78, tsBytes: 263033, apiRoutes: 24, pages: 17,
      unit: 8, functional: 7, integration: 0, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '135 pass', lintResult: "exit 1 — next lint removed; legacy .eslintrc.json unreadable by ESLint v9",
      extraDeps: '—', nextAuth: '^5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-opencode-glm-5.1', agent: 'opencode', agentVersion: '1.17.4', model: 'GLM 5.1', commit: 'a54e68b',
      tsFiles: 95, tsBytes: 241817, apiRoutes: 24, pages: 18,
      unit: 7, functional: 7, integration: 0, e2e: 0,
      asAny: 60, colonAny: 36, tsIgnore: 0, middleware: 'src/middleware.ts (spec violation)', lintScript: 'eslint . (works)',
      eslintConfig: true, npmCi: true, tsc: true, vitest: '115 pass', lintResult: 'exit 1 — 119 err / 72 warn',
      extraDeps: 'uuid@^14 + @types/uuid', nextAuth: '5.0.0-beta.31', zod: '^3.25.0 (v3)', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-opencode-glm-5.2', agent: 'opencode', agentVersion: '1.17.4', model: 'GLM 5.2', commit: 'f4869dc',
      tsFiles: 97, tsBytes: 327706, apiRoutes: '25 (+/sales/export)', pages: 18,
      unit: 7, functional: 5, integration: 0, e2e: 0,
      asAny: 9, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '134 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: "explicit 'strict'"
    },
    {
      branch: 'build-pi-glm-5.1', agent: 'pi', agentVersion: '0.79.2', model: 'GLM 5.1', commit: '0e8f3b2',
      tsFiles: 80, tsBytes: 251928, apiRoutes: '22 (−/mileage/export, −/mileage/reports)', pages: 18,
      unit: 6, functional: 3, integration: 0, e2e: 0,
      asAny: 26, colonAny: 37, tsIgnore: 2, middleware: 'src/middleware.ts (spec violation)', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '95 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-vscode-glm-5.2', agent: 'VS Code (GitHub Copilot)', agentVersion: '1.126.0', model: 'GLM 5.2', commit: '9e70fb6',
      tsFiles: 85, tsBytes: 267796, apiRoutes: 24, pages: 18,
      unit: 7, functional: 2, integration: 0, e2e: 1,
      asAny: 1, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '100 pass', lintResult: "exit 1 — next lint removed",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: 'default'
    },
    {
      branch: 'build-pi-glm-5.2', agent: 'pi', agentVersion: '0.79.2', model: 'GLM 5.2', commit: '8f12e40',
      tsFiles: 72, tsBytes: 282459, apiRoutes: 24, pages: 17,
      unit: 7, functional: 7, integration: 0, e2e: 0,
      asAny: 29, colonAny: 17, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: true, tsc: true, vitest: '137 pass', lintResult: "exit 1 — next lint removed; legacy .eslintrc.json unreadable by ESLint v9",
      extraDeps: '—', nextAuth: '5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10', sameSite: "explicit 'strict'"
    },
    {
      branch: 'build-codex-glm-5.2', agent: 'Codex', agentVersion: 'Codex CLI 0.142.5', model: 'GLM 5.2', commit: '3905f11',
      tsFiles: 74, tsBytes: 230371, apiRoutes: 24, pages: 17,
      unit: 7, functional: 7, integration: 1, e2e: 5,
      asAny: 0, colonAny: 0, tsIgnore: 0, middleware: 'src/proxy.ts', lintScript: 'next lint (broken in Next 16)',
      eslintConfig: false, npmCi: false, tsc: false, vitest: '77 pass / 16 fail', lintResult: "exit 1 — next lint removed; no eslint.config.mjs; npx eslint . fallback also fails",
      extraDeps: '—', nextAuth: '^5.0.0-beta.30', zod: '^4.3.6', bcryptApp: '10 (hardcoded at each call site)', sameSite: 'default'
    },
    {
      branch: 'build-ibm-bob', agent: 'IBM build (excluded)', agentVersion: '2.0', model: '—', commit: '—',
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
      { req: '2 roles + canViewAll (no power_user)',            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: "all schema.ts: role enum ['admin','user'] + canViewAll" },
      { req: 'No CSRF token system',                            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'no csrf.ts / csrf-provider.tsx / useCsrfToken.ts in any branch' },
      { req: 'No revoked_tokens table',                         claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'all schemas: 6 tables only' },
      { req: 'No account lockout columns',                      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'no failed_login_attempts/locked_until' },
      { req: 'No in-app rate limiter',                           claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'no rate-limit.ts' },
      { req: 'Single-source profit (TS only)',                   claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'all reports/route.ts use calculateProfit; 0 SQL profit expressions' },
      { req: 'No auto $0 sales on donate/discard',               claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'all set only removalDate; no sales insert on transition' },
      { req: 'app_config single-row table',                      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'all schemas: appConfig with id default(1)' },
      { req: 'Removed tables absent',                            claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'all schemas' },
      { req: 'withAuth wrapper pattern',                         claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'partial', pi51: 'partial', vscode52: 'pass', pi52: 'partial', codex52: 'partial', opencodeM3: 'pass', evidence: 'claude52/51, opencode17174, vscode52 use export const POST = withAuth(...); opencode52, pi-5.2, pi-5.1, codex-5.2 wrap inside async function POST (functionally equivalent, deviates from canonical form)' },
      { req: 'Server Components for data pages',                 claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'inventory/page.tsx, sales/page.tsx, reports/page.tsx, app/page.tsx' },
      { req: 'calculateSalesTaxFromPrice formula matches spec',  claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'FAIL', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: 'vscode52 uses price * rate (add tax) instead of price - price/(1+rate) (extract from tax-inclusive); pi-5.2 and codex-5.2 use the spec formula correctly' }
    ],
    '3.2 API surface': [
      { req: 'All 43 spec endpoints present',      claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass (+1 extra /sales/export)', pi51: 'FAIL (-/mileage/export, -/mileage/reports)', vscode52: 'pass', pi52: 'pass', codex52: 'pass (all 24 present)', opencodeM3: 'pass (all 24 present)', evidence: '' },
      { req: 'Removed endpoints absent',           claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: '/api/auth/* exempt from Origin check', claude52: 'pass (also /api/setup)', claude51: 'pass', opencode17174: 'FAIL', opencode52: 'partial (no explicit exemption)', pi51: 'pass (also /api/setup POST)', vscode52: 'FAIL (no exemption)', pi52: 'FAIL (no exemption — regression vs pi-5.1)', codex52: 'FAIL (no exemption)', opencodeM3: 'FAIL (no exemption)', evidence: '' }
    ],
    '3.3 Config & ops': [
      { req: 'src/proxy.ts middleware (named per spec)',   claude52: 'pass', claude51: 'pass', opencode17174: 'FAIL (src/middleware.ts)', opencode52: 'pass', pi51: 'FAIL (src/middleware.ts)', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'next.config.ts security headers + CSP',      claude52: 'pass (+serverExternalPackages)', claude51: 'pass', opencode17174: 'pass (+serverExternalPackages)', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass (+serverExternalPackages)', evidence: '' },
      { req: 'Caddyfile rate limit 5/15min auth + 100/15min api', claude52: 'pass (scoped via handle)', claude51: 'pass', opencode17174: 'pass (scoped via handle_path)', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass (global zones)', codex52: 'pass (global zones)', opencodeM3: 'pass (global zones)', evidence: '' },
      { req: 'Dockerfile multi-stage + /data + non-root user', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'bcrypt cost factor 10 (SEC-02)',              claude52: 'pass (centralized)', claude51: 'partial (12 app, 10 seed)', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'drizzle.config.ts → ./src/lib/schema.ts',     claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'Migration .sql + meta/ journal',              claude52: 'pass', claude51: 'partial (missing meta/)', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'partial (missing meta/ — only 0000_initial.sql)', opencodeM3: 'pass', evidence: '' }
    ],
    '3.4 RBAC & auth': [
      { req: 'passwordChangedAt session invalidation (AUTH-02)', claude52: 'pass+ (live-refresh every request)', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'FAIL (broken — never written to JWT)', vscode52: 'pass', pi52: 'pass (login-only)', codex52: 'pass (login-only)', opencodeM3: 'pass (login-only)', evidence: '' },
      { req: 'withAuth also rejects deactivated accounts',  claude52: 'pass', claude51: 'FAIL', opencode17174: 'FAIL', opencode52: 'FAIL', pi51: 'FAIL', vscode52: 'FAIL', pi52: 'FAIL', codex52: 'FAIL', opencodeM3: 'FAIL', evidence: '' },
      { req: 'SEC-11 admin cannot deactivate/role-change own account', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'USR-02 password policy (8–128 + 4 char classes)', claude52: 'pass', claude51: 'pass', opencode17174: 'pass', opencode52: 'pass', pi51: 'pass', vscode52: 'pass', pi52: 'pass', codex52: 'pass', opencodeM3: 'pass', evidence: '' },
      { req: 'SameSite=Strict cookie (SEC-01)',            claude52: 'pass (explicit)', claude51: 'partial (default)', opencode17174: 'partial (default)', opencode52: 'pass (explicit)', pi51: 'partial (default)', vscode52: 'partial (default)', pi52: 'pass (explicit)', codex52: 'partial (default)', opencodeM3: 'partial (default)', evidence: '' }
    ],
    '3.5 Test conformance': [
      { req: '7 unit tests',        claude52: '7', claude51: '7', opencode17174: '7', opencode52: '7', pi51: '6', vscode52: '7', pi52: '7', codex52: '7 (5 pass / 2 fail: api-auth, api-utils)', opencodeM3: '8', evidence: '' },
      { req: '7 functional tests',   claude52: '7', claude51: '7', opencode17174: '7', opencode52: '5', pi51: '3', vscode52: '2 (missing 5: password-invalidation, setup-lock, sale-refund-flow, inventory-removal-date, refund-impact)', pi52: '7', codex52: '7 (1 pass / 6 fail — workflows crash with Cannot read properties of undefined)', opencodeM3: '7', evidence: '' },
      { req: '9 integration tests', claude52: '9', claude51: '0', opencode17174: '0', opencode52: '0', pi51: '0', vscode52: '0', pi52: '0', codex52: '1 (origin-validation, failing)', opencodeM3: '0', evidence: '' },
      { req: '5 e2e specs',         claude52: '5', claude51: '5', opencode17174: '0', opencode52: '0', pi51: '0', vscode52: '1 (auth only)', pi52: '0', codex52: '5 (auth, inventory, sales, import, rbac — not run statically)', opencodeM3: '5', evidence: '' }
    ]
  },

  // ---------- Type discipline (§4.1) ----------
  typeDiscipline: [
    { branch: 'build-claude-glm-5.2',          asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-claude-glm-5.1',          asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-opencode-minimax-m3',     asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-codex-glm-5.2',           asAny: 0,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 0 },
    { branch: 'build-vscode-glm-5.2',          asAny: 1,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 1 },
    { branch: 'build-opencode-glm-5.2',        asAny: 9,  colonAny: 0,  anyGeneric: 0, tsIgnore: 0, total: 9 },
    { branch: 'build-pi-glm-5.2',              asAny: 29, colonAny: 17, anyGeneric: 4, tsIgnore: 0, total: 50 },
    { branch: 'build-pi-glm-5.1',              asAny: 26, colonAny: 37, anyGeneric: 10, tsIgnore: 2, total: 75 },
    { branch: 'build-opencode-glm-5.1', asAny: 60, colonAny: 36, anyGeneric: 1, tsIgnore: 0, total: 97 }
  ],

  // ---------- Lint outcomes (§4.2) ----------
  lintOutcomes: [
    { branch: 'build-claude-glm-5.2',          command: 'eslint .',  result: 'exit 0 — 0 errors, 0 warnings' },
    { branch: 'build-claude-glm-5.1',          command: 'eslint',    result: 'exit 1 — 11 errors, 81 warnings (all errors are no-explicit-any in test files)' },
    { branch: 'build-opencode-minimax-m3',     command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs (legacy .eslintrc.json unreadable by ESLint v9); lint pipeline non-functional' },
    { branch: 'build-opencode-glm-5.1', command: 'eslint .',  result: 'exit 1 — 119 errors, 72 warnings (errors spread across src/ and tests)' },
    { branch: 'build-opencode-glm-5.2',        command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' },
    { branch: 'build-pi-glm-5.2',              command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs (legacy .eslintrc.json unreadable by ESLint v9); lint pipeline non-functional' },
    { branch: 'build-pi-glm-5.1',               command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' },
    { branch: 'build-vscode-glm-5.2',           command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; lint pipeline non-functional' },
    { branch: 'build-codex-glm-5.2',            command: 'next lint', result: 'exit 1 — command removed in Next 16; no eslint.config.mjs; npx eslint . fallback also fails (no config found); lint pipeline non-functional' }
  ],

  // ---------- Complexity (§6) ----------
  complexity: [
    { branch: 'build-codex-glm-5.2',            tsBytes: 230371, files: 74,  largestModule: 'validations.ts 274 lines',     extraModules: '0' },
    { branch: 'build-opencode-minimax-m3',     tsBytes: 263033, files: 78,  largestModule: 'schema.ts 221 lines',         extraModules: '0' },
    { branch: 'build-opencode-glm-5.1', tsBytes: 241817, files: 95,  largestModule: 'schema.ts ~5 KB',         extraModules: '0 (tightest)' },
    { branch: 'build-pi-glm-5.1',              tsBytes: 251928, files: 80,  largestModule: 'auth.ts ~4 KB',          extraModules: '0' },
    { branch: 'build-vscode-glm-5.2',           tsBytes: 267796, files: 85,  largestModule: 'reports/route.ts 104 lines', extraModules: '0' },
    { branch: 'build-pi-glm-5.2',               tsBytes: 282459, files: 72,  largestModule: 'reports/route.ts',        extraModules: '0' },
    { branch: 'build-opencode-glm-5.2',        tsBytes: 327706, files: 97,  largestModule: 'inventory-queries.ts 3.8 KB + sales-queries.ts', extraModules: '+4 (http-utils, inventory-queries, sales-queries, rbac)' },
    { branch: 'build-claude-glm-5.1',          tsBytes: 354587, files: 96,  largestModule: 'reports/route.ts 99 lines', extraModules: '0' },
    { branch: 'build-claude-glm-5.2',          tsBytes: 356980, files: 111, largestModule: 'reports/route.ts 112 lines', extraModules: '+4 (api-client, inventory-logic, app-shell, client-shell)' }
  ],

  // ---------- Findings by severity (§8) ----------
  findings: [
    { sev: 'High',   branch: 'build-opencode-minimax-m3, build-opencode-glm-5.2, build-vscode-glm-5.2', finding: "seed.ts crashes: Cannot find module 'dotenv/config' (dotenv not in package.json — broken boot script)", location: 'src/scripts/seed.ts' },
    { sev: 'High',   branch: 'build-codex-glm-5.2',                           finding: 'tsc --noEmit exits 1 with 101 errors (62 in src/: TS7053 implicit-any indexing of Drizzle builders, TS2719 dual-User-type conflicts; 38 in tests/) — only branch that does not compile', location: 'src/app/api/admin/users/route.ts, src/app/api/admin/users/[id]/route.ts, src/app/admin/users/page.tsx, tests/**' },
    { sev: 'High',   branch: 'build-codex-glm-5.2',                           finding: 'vitest run exits 1: 16 of 93 tests fail (all 7 functional workflows, 2 unit auth, 1 integration) with Cannot read properties of undefined (reading id) from misused .returning() chain', location: 'tests/functional/workflows/*, tests/unit/api-auth.test.ts, tests/unit/api-utils.test.ts, tests/integration/api/origin-validation.test.ts' },
    { sev: 'High',   branch: 'build-pi-glm-5.1',                           finding: 'passwordChangedAt never written to JWT → session invalidation always no-ops (AUTH-02/SEC-03 broken)', location: 'src/lib/auth.ts:90-97' },
    { sev: 'High',   branch: 'build-opencode-glm-5.2, build-pi-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2, build-codex-glm-5.2', finding: "lint script uses removed next lint; no eslint.config.mjs; lint pipeline non-functional", location: 'package.json scripts' },
    { sev: 'Med',    branch: 'build-vscode-glm-5.2',                       finding: "calculateSalesTaxFromPrice uses price * rate instead of spec's price - price/(1+rate) (SALE-04 deviation)", location: 'src/lib/financial.ts:48' },
    { sev: 'Med',    branch: 'build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.2, build-vscode-glm-5.2, build-codex-glm-5.2, build-opencode-minimax-m3', finding: 'validateOriginOrReferer does not exempt /api/auth/* (AUTH-04 deviation)', location: 'src/lib/api-utils.ts / http-utils.ts' },
    { sev: 'Med',    branch: 'build-claude-glm-5.1, build-opencode-glm-5.1, build-pi-glm-5.1, build-vscode-glm-5.2, build-codex-glm-5.2, build-opencode-minimax-m3', finding: 'No explicit SameSite=Strict on session cookie (relies on NextAuth default lax)', location: 'src/lib/auth.ts' },
    { sev: 'Med',    branch: 'build-pi-glm-5.1',                           finding: 'Missing /api/mileage/export and /api/mileage/reports endpoints (MILE-02, MILE-03)', location: 'src/app/api/mileage/' },
    { sev: 'Med',    branch: 'claude-5.1, opencode-5.1, opencode-5.2, pi-5.1, vscode-5.2, build-opencode-minimax-m3', finding: 'No integration tests produced (spec requires 9 under tests/integration/api/)', location: 'tests/integration/ absent' },
    { sev: 'Med',    branch: 'build-vscode-glm-5.2',                       finding: 'Only 2 of 7 required functional tests (missing password-invalidation, setup-lock, sale-refund-flow, inventory-removal-date, refund-impact)', location: 'tests/functional/' },
    { sev: 'Med',    branch: 'build-codex-glm-5.2',                        finding: 'Only 1 of 9 required integration tests (origin-validation only; and it fails at runtime)', location: 'tests/integration/' },
    { sev: 'Med',    branch: 'build-pi-glm-5.2, build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2, build-codex-glm-5.2, build-opencode-minimax-m3', finding: 'JWT refresh is login-only — passwordChangedAt/role/canViewAll/isActive not refreshed from DB on every request (AUTH-02 minimum met, but REG-06 functional scenario fails)', location: 'src/lib/auth.ts jwt callback' },
    { sev: 'Low',    branch: 'build-opencode-glm-5.1, build-pi-glm-5.1', finding: 'Middleware named src/middleware.ts not src/proxy.ts (BUILD_PROMPT STEP 6)', location: 'src/' },
    { sev: 'Low',    branch: 'build-claude-glm-5.1, build-codex-glm-5.2',                       finding: 'Migration directory lacks meta/_journal.json (only .sql); may break drizzle-kit migrate', location: 'drizzle/' },
    { sev: 'Low',    branch: 'build-claude-glm-5.1',                       finding: 'bcrypt cost 12 in app code, 10 in seed (inconsistent; both ≥ spec)', location: 'src/app/api/*/route.ts, src/scripts/seed.ts' },
    { sev: 'Low',    branch: 'build-opencode-glm-5.1',              finding: 'zod v3 pinned while spec ecosystem is v4; 97 type-escape occurrences in src/', location: 'package.json, src/lib/auth.ts' },
    { sev: 'Low',    branch: 'build-opencode-glm-5.1',              finding: 'Adds uuid@^14 dependency not used by core id flow', location: 'package.json' },
    { sev: 'Low',    branch: 'build-pi-glm-5.2',                             finding: '50 type-escape occurrences in src/ (29 as any + 17 : any + 4 <any>); NextAuth module augmentation incomplete (iat/passwordChangedAt untyped on session, accessed via as any)', location: 'src/lib/api-utils.ts, src/lib/auth-utils.ts, src/app/*/page.tsx, src/lib/backup.ts' },
    { sev: 'Low',    branch: 'build-codex-glm-5.2',                          finding: 'No package-lock.json shipped (commit msg notes npm registry unavailable in build sandbox); npm ci must be replaced with npm install (one-time install cost, not a build defect)', location: 'package.json (no lockfile)' },
    { sev: 'Low',    branch: 'build-codex-glm-5.2',                          finding: 'No NextAuth module augmentation — jwt/session callbacks use inline (user as { id: string }).id casts (avoids as any literally but bypasses the type system; contributes to TS2719 dual-User conflicts in admin pages)', location: 'src/lib/auth.ts:51-71, src/app/admin/users/page.tsx:53' },
    { sev: 'Low',    branch: 'build-vscode-glm-5.2',                       finding: 'Only 1 of 5 required e2e specs (auth only; missing inventory, sales, rbac, import)', location: 'tests/e2e/' },
    { sev: 'Low',    branch: 'build-vscode-glm-5.2',                       finding: 'Schema imports check from drizzle-orm but never uses it (dead import)', location: 'src/lib/schema.ts:1' },
    { sev: 'Info',   branch: 'build-claude-glm-5.2',                       finding: 'Extra modules api-client, inventory-logic, app-shell, client-shell (well-scoped refinements, spec-list deviation)', location: 'src/lib/, src/components/' },
    { sev: 'Info',   branch: 'build-opencode-glm-5.2',                    finding: 'Extra modules http-utils, inventory-queries, sales-queries, rbac (cleaner separation, spec-list deviation)', location: 'src/lib/' },
    { sev: 'Info',   branch: 'build-pi-glm-5.1',                           finding: '13 console.log in src/ (highest density)', location: 'various' },
    { sev: 'Info',   branch: 'build-vscode-glm-5.2',                       finding: '1 as any in db.ts Proxy pattern (pragmatic escape for dynamic property forwarding)', location: 'src/lib/db.ts:43' },
    { sev: 'Info',   branch: 'build-codex-glm-5.2',                        finding: 'Smallest byte total in the cohort (230 KB) and zero explicit type escapes — but the zero-escape count is misleading: tsc surfaces 62 implicit-any errors in src/, so the source does not actually type-check. Ships all 5 e2e spec files (matching claude-5.2) and a playwright.config.ts', location: 'src/app/api/admin/users/, tsc log' },
    { sev: 'Info',   branch: 'build-opencode-minimax-m3',                   finding: 'First build generated by a non-GLM model (MiniMax M3); zero explicit type escapes, tsc clean, 135 tests pass, 5 e2e specs, canonical withAuth + proxy naming, complete NextAuth module augmentation', location: 'src/' }
  ],

  // ---------- Raw verification (Appendix A) ----------
  rawVerification: [
    { branch: 'build-claude-glm-5.2',          npmCi: 'exit 0', lint: 'exit 0 — 0 err / 0 warn',       tsc: 'exit 0 (clean)', vitest: 'exit 0 — 23 files, 186 tests' },
    { branch: 'build-claude-glm-5.1',          npmCi: 'exit 0', lint: 'exit 1 — 11 err / 81 warn',     tsc: 'exit 0 (clean)', vitest: 'exit 0 — 14 files, 121 tests' },
    { branch: 'build-opencode-minimax-m3',     npmCi: 'exit 0', lint: 'exit 1 — next lint removed; legacy .eslintrc.json unreadable by ESLint v9', tsc: 'exit 0 (clean)', vitest: 'exit 0 — 15 files, 135 tests' },
    { branch: 'build-opencode-glm-5.1', npmCi: 'exit 0', lint: 'exit 1 — 119 err / 72 warn',   tsc: 'exit 0 (clean)', vitest: 'exit 0 — 14 files, 115 tests' },
    { branch: 'build-opencode-glm-5.2',        npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 12 files, 134 tests' },
    { branch: 'build-pi-glm-5.1',              npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 9 files, 95 tests' },
    { branch: 'build-pi-glm-5.2',              npmCi: 'exit 0', lint: 'exit 1 — next lint removed; legacy .eslintrc.json unreadable by ESLint v9', tsc: 'exit 0 (clean)', vitest: 'exit 0 — 14 files, 137 tests' },
    { branch: 'build-vscode-glm-5.2',          npmCi: 'exit 0', lint: 'exit 1 — next lint removed',    tsc: 'exit 0 (clean)', vitest: 'exit 0 — 9 files, 100 tests' },
    { branch: 'build-codex-glm-5.2',           npmCi: 'npm install (no lockfile)', lint: 'exit 1 — next lint removed; no eslint.config.mjs; npx eslint . fallback also fails', tsc: 'exit 1 — 101 errors (62 src / 38 tests)', vitest: 'exit 1 — 77 pass / 16 fail (7 files fail)' }
  ],

  // ---------- Variances between branches (§7) — key dimensions ----------
  variances: [
    { dimension: 'withAuth signature', claude52: 'export const POST = withAuth(...) — matches spec', claude51: 'same as claude-5.2', opencode17174: 'same as claude-5.2', opencode52: 'wraps inside async function POST', pi51: 'withAuth(req, handler) — different signature', vscode52: 'export const POST = withAuth(...) — matches spec', pi52: 'wraps inside async function POST', codex52: 'wraps inside async function POST', opencodeM3: 'export const POST = withAuth(...) — matches spec' },
    { dimension: 'Middleware filename', claude52: 'src/proxy.ts (spec)', claude51: 'src/proxy.ts (spec)', opencode17174: 'src/middleware.ts (Next.js)', opencode52: 'src/proxy.ts (spec)', pi51: 'src/middleware.ts (Next.js)', vscode52: 'src/proxy.ts (spec)', pi52: 'src/proxy.ts (spec)', codex52: 'src/proxy.ts (spec)', opencodeM3: 'src/proxy.ts (spec)' },
    { dimension: 'lint script', claude52: 'eslint . (works, clean)', claude51: 'eslint (works)', opencode17174: 'eslint . (works)', opencode52: 'next lint (broken)', pi51: 'next lint (broken)', vscode52: 'next lint (broken)', pi52: 'next lint (broken)', codex52: 'next lint (broken)', opencodeM3: 'next lint (broken)' },
    { dimension: 'eslint.config.mjs', claude52: 'yes', claude51: 'yes', opencode17174: 'yes', opencode52: 'no', pi51: 'no', vscode52: 'no', pi52: 'no (legacy .eslintrc.json)', codex52: 'no', opencodeM3: 'no (legacy .eslintrc.json)' },
    { dimension: 'Schema timestamp mode', claude52: 'raw integer (unix s)', claude51: 'raw integer (unix s)', opencode17174: "{ mode: 'timestamp' } (Date)", opencode52: 'raw integer (unix s)', pi51: 'raw integer (unix s)', vscode52: 'raw integer (unix s)', pi52: "{ mode: 'number' } (typed number)", codex52: "{ mode: 'number' } (typed number)", opencodeM3: "{ mode: 'number' } (typed number)" },
    { dimension: 'Schema boolean mode', claude52: 'raw 0/1 + toBool/fromBool helpers', claude51: 'raw 0/1 integer', opencode17174: "{ mode: 'boolean' }", opencode52: "{ mode: 'boolean' }", pi51: 'raw 0/1 integer', vscode52: 'raw 0/1 integer', pi52: "{ mode: 'boolean' }", codex52: "{ mode: 'boolean' }", opencodeM3: "{ mode: 'boolean' }" },
    { dimension: 'JWT callback refreshes live fields from DB', claude52: 'every request', claude51: 'login-only', opencode17174: 'login-only', opencode52: 'login-only', pi51: 'login-only (broken)', vscode52: 'login-only', pi52: 'login-only', codex52: 'login-only', opencodeM3: 'login-only' },
    { dimension: 'withAuth rejects deactivated accounts', claude52: 'yes', claude51: 'no', opencode17174: 'no', opencode52: 'no', pi51: 'no', vscode52: 'no', pi52: 'no', codex52: 'no', opencodeM3: 'no' },
    { dimension: 'calculateSalesTaxFromPrice formula', claude52: 'spec: price - price/(1+rate)', claude51: 'same', opencode17174: 'same', opencode52: 'same', pi51: 'same', vscode52: 'differs: price * rate (adds tax, not extracts)', pi52: 'same', codex52: 'spec: price - price/(1+rate)', opencodeM3: 'spec: price - price/(1+rate)' },
    { dimension: 'NextAuth module augmentation', claude52: 'next-auth + @auth/core/jwt', claude51: 'next-auth + @auth/core/jwt', opencode17174: 'next-auth only', opencode52: 'next-auth only', pi51: 'none (uses as any)', vscode52: 'next-auth + @auth/core/jwt', pi52: 'next-auth only (incomplete — iat/pca untyped)', codex52: 'none (uses inline as { ... } casts)', opencodeM3: 'next-auth only (complete — covers iat/passwordChangedAt)' },
    { dimension: 'Extra dependency', claude52: '—', claude51: '—', opencode17174: 'uuid@^14 + @types/uuid', opencode52: '—', pi51: '—', vscode52: '—', pi52: '—', codex52: '—', opencodeM3: '—' },
    { dimension: 'zod version', claude52: 'v4', claude51: 'v4', opencode17174: 'v3', opencode52: 'v4', pi51: 'v4', vscode52: 'v4', pi52: 'v4', codex52: 'v4', opencodeM3: 'v4' },
    { dimension: 'Extra API endpoint', claude52: '—', claude51: '—', opencode17174: '—', opencode52: '+ /api/sales/export', pi51: '—', vscode52: '—', pi52: '—', codex52: '—', opencodeM3: '—' },
    { dimension: 'Missing API endpoints', claude52: '—', claude51: '—', opencode17174: '—', opencode52: '—', pi51: '- /mileage/export, - /mileage/reports', vscode52: '—', pi52: '—', codex52: '—', opencodeM3: '—' },
    { dimension: 'Migration meta/ journal', claude52: 'yes', claude51: 'no (missing)', opencode17174: 'yes', opencode52: 'yes', pi51: 'yes', vscode52: 'yes', pi52: 'yes', codex52: 'no (missing — only 0000_initial.sql)', opencodeM3: 'yes' },
    { dimension: 'bcrypt cost (app code)', claude52: '10 (centralized in config.ts)', claude51: '12 (inconsistent w/ seed)', opencode17174: '10', opencode52: '10', pi51: '10', vscode52: '10', pi52: '10', codex52: '10 (hardcoded at each call site)', opencodeM3: '10' },
    { dimension: 'SameSite cookie config', claude52: "explicit 'strict'", claude51: 'default', opencode17174: 'default', opencode52: "explicit 'strict'", pi51: 'default', vscode52: 'default', pi52: "explicit 'strict'", codex52: 'default', opencodeM3: 'default' },
    { dimension: 'serverExternalPackages in next.config', claude52: 'yes', claude51: 'no', opencode17174: 'yes', opencode52: 'no', pi51: 'no', vscode52: 'no', pi52: 'no', codex52: 'no', opencodeM3: 'yes' },
    { dimension: 'Caddyfile rate-limit scoping', claude52: 'scoped via handle /api/auth/*', claude51: 'global zones', opencode17174: 'scoped via handle_path /api/auth/*', opencode52: 'global zones', pi51: 'global zones', vscode52: 'global zones', pi52: 'global zones', codex52: 'global zones', opencodeM3: 'global zones' },
    { dimension: 'Extra modules (beyond spec list)', claude52: 'api-client, inventory-logic, app-shell, client-shell', claude51: '0', opencode17174: '0', opencode52: 'http-utils, inventory-queries, sales-queries, rbac', pi51: '0', vscode52: '0', pi52: '0', codex52: '0', opencodeM3: '0' },
    { dimension: 'Seed admin email', claude52: 'admin@example.com', claude51: 'admin@resalemanager.com', opencode17174: 'security@lawsonsoft.com', opencode52: 'admin@example.com (via /api/setup)', pi51: 'admin@example.com', vscode52: 'admin@example.com (via /api/setup)', pi52: 'security@lawsonsoft.com', codex52: 'security@lawsonsoft.com', opencodeM3: 'admin@example.com' },
    { dimension: 'tsc --noEmit', claude52: '✓ exit 0', claude51: '✓ exit 0', opencode17174: '✓ exit 0', opencode52: '✓ exit 0', pi51: '✓ exit 0', vscode52: '✓ exit 0', pi52: '✓ exit 0', codex52: '✗ exit 1 (101 errors)', opencodeM3: '✓ exit 0' },
    { dimension: 'vitest run', claude52: '✓ 186 pass', claude51: '✓ 121 pass', opencode17174: '✓ 115 pass', opencode52: '✓ 134 pass', pi51: '✓ 95 pass', vscode52: '✓ 100 pass', pi52: '✓ 137 pass', codex52: '✗ 77 pass / 16 fail', opencodeM3: '✓ 135 pass' }
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
    { name: 'BUILD_EVAL_PROMPT.md',  path: 'docs/BUILD_EVAL_PROMPT.md',  blurb: 'Reusable prompt that drives the static-analysis build evaluation' },
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
  "status": "complete",
  "dateCompleted": "2026-07-06",
  "methodology": "Playwright 1.61.1 chromium, next dev boot, 3 retries/flow, admin via native seed or /api/setup fallback, drizzle-kit migrate where required, AUTH_SECRET env set where required",
  "branches": {
    "build-claude-glm-5.2": {
      "bootMode": "dev (auto-migrate via lazy proxy)",
      "flows": [
        {
          "id": "auth",
          "status": "pass",
          "attempts": "8/8 tests pass",
          "error": ""
        },
        {
          "id": "inventory",
          "status": "pass",
          "attempts": "6/6 tests pass",
          "error": ""
        },
        {
          "id": "sales",
          "status": "pass",
          "attempts": "5/5 tests pass",
          "error": ""
        },
        {
          "id": "import",
          "status": "pass",
          "attempts": "3/3 tests pass",
          "error": ""
        },
        {
          "id": "rbac",
          "status": "pass",
          "attempts": "4/4 tests pass",
          "error": ""
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "pass",
          "error": ""
        }
      ],
      "failures": [],
      "functionalScore": 100,
      "summary": "The only fully-functional build. All 5 flows pass and all 18 regression scenarios pass. Live JWT refresh of passwordChangedAt makes REG-06 work. No remediation required."
    },
    "build-claude-glm-5.1": {
      "bootMode": "dev (auto-migrate via app + drizzle-kit)",
      "flows": [
        {
          "id": "auth",
          "status": "fail",
          "attempts": "5/8 tests pass",
          "error": "Error: expect(received).toBeFalsy() | Received: true"
        },
        {
          "id": "inventory",
          "status": "fail",
          "attempts": "0/6 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "sales",
          "status": "fail",
          "attempts": "0/5 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "import",
          "status": "pass",
          "attempts": "3/3 tests pass",
          "error": ""
        },
        {
          "id": "rbac",
          "status": "fail",
          "attempts": "1/4 tests pass",
          "error": "Error: expect(received).toBeTruthy() | Received: undefined"
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBeDefined() | Received: undefined"
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBeTruthy() | Received: undefined"
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBeTruthy() | Received: false"
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": null,
          "error": "Error: expect(received).toBeFalsy() | Received: true",
          "effort": "S",
          "prompt": "Fix per spec: fix the NextAuth credentials callback to authenticate valid credentials."
        },
        {
          "flowId": "auth",
          "scenarioId": null,
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200",
          "effort": "M",
          "prompt": "Fix per spec: fix the failing behavior to match the spec."
        },
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toBeDefined() | Received: undefined",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        },
        {
          "flowId": "inventory",
          "scenarioId": null,
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per spec: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-12",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-13",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-14",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per INV-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-05",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per INV-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-17",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per INV-05: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-01",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-02",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-03",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-04",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-02: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-18",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-10",
          "error": "Error: expect(received).toBeTruthy() | Received: undefined",
          "effort": "M",
          "prompt": "Fix per INV-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-11",
          "error": "Error: expect(received).toBeTruthy() | Received: false",
          "effort": "M",
          "prompt": "Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-15",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per BAK-02: fix the failing behavior to match the spec."
        }
      ],
      "functionalScore": 35,
      "summary": "Auth gating and CSV import work (9/26 pass), but sale and inventory creation return HTTP 500, cascading to fail REG-01..REG-05, REG-12..REG-14, REG-17, REG-18. REG-06 fails (no live JWT refresh). REG-10/REG-11 fail."
    },
    "build-opencode-glm-5.1": {
      "bootMode": "dev (drizzle-kit migrate required)",
      "flows": [
        {
          "id": "auth",
          "status": "fail",
          "attempts": "7/8 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "inventory",
          "status": "fail",
          "attempts": "5/6 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"returned\" | Received: \"sold\""
        },
        {
          "id": "sales",
          "status": "fail",
          "attempts": "0/5 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "import",
          "status": "pass",
          "attempts": "3/3 tests pass",
          "error": ""
        },
        {
          "id": "rbac",
          "status": "fail",
          "attempts": "3/4 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"returned\" | Received: \"sold\""
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-14",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"returned\" | Received: \"sold\"",
          "effort": "S",
          "prompt": "Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-01",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-02",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-03",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-04",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-02: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-18",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-11",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete."
        }
      ],
      "functionalScore": 69,
      "summary": "18/26 pass once drizzle-kit migrate is applied. Fails concentrate in sales (POST 500), REG-14 (returned status), REG-06, and REG-11. RBAC view and most inventory flows work."
    },
    "build-opencode-glm-5.2": {
      "bootMode": "dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv)",
      "flows": [
        {
          "id": "auth",
          "status": "fail",
          "attempts": "7/8 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "inventory",
          "status": "pass",
          "attempts": "6/6 tests pass",
          "error": ""
        },
        {
          "id": "sales",
          "status": "pass",
          "attempts": "5/5 tests pass",
          "error": ""
        },
        {
          "id": "import",
          "status": "fail",
          "attempts": "2/3 tests pass",
          "error": "Error: expect(received).toBeTruthy() | Received: false"
        },
        {
          "id": "rbac",
          "status": "fail",
          "attempts": "3/4 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "pass",
          "error": ""
        }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        },
        {
          "flowId": "import",
          "scenarioId": null,
          "error": "Error: expect(received).toBeTruthy() | Received: false",
          "effort": "S",
          "prompt": "Fix per spec: fix the mileage import path in POST /api/import for type=mileage."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-11",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete."
        }
      ],
      "functionalScore": 88,
      "summary": "23/26 pass. Only REG-06, mileage CSV import, and REG-11 fail. seed.ts is broken (missing dotenv); admin bootstrapped via /api/setup."
    },
    "build-pi-glm-5.1": {
      "bootMode": "dev (drizzle-kit migrate required)",
      "flows": [
        {
          "id": "auth",
          "status": "fail",
          "attempts": "7/8 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "inventory",
          "status": "fail",
          "attempts": "3/6 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"E2E Item\" | Received: undefined"
        },
        {
          "id": "sales",
          "status": "fail",
          "attempts": "0/5 tests pass",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "import",
          "status": "pass",
          "attempts": "3/3 tests pass",
          "error": ""
        },
        {
          "id": "rbac",
          "status": "fail",
          "attempts": "3/4 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBeTruthy() | Received: undefined"
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"sold\" | Received: undefined"
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "fail",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500"
        }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        },
        {
          "flowId": "inventory",
          "scenarioId": null,
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"E2E Item\" | Received: undefined",
          "effort": "M",
          "prompt": "Fix per spec: fix the failing behavior to match the spec."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-13",
          "error": "Error: expect(received).toBeTruthy() | Received: undefined",
          "effort": "S",
          "prompt": "Fix per INV-02: set removalDate when status transitions to donated."
        },
        {
          "flowId": "inventory",
          "scenarioId": "REG-14",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: \"sold\" | Received: undefined",
          "effort": "S",
          "prompt": "Fix per INV-02: clear removalDate on returned→available and ensure refund_with_return sets returned."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-01",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-02: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-02",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-03",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-03: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-04",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per SALE-02: fix the failing behavior to match the spec."
        },
        {
          "flowId": "sales",
          "scenarioId": "REG-18",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 201 | Received: 500",
          "effort": "M",
          "prompt": "Fix per SALE-04: POST handler throws 500; fix the sale/inventory creation route to not crash on valid input."
        },
        {
          "flowId": "rbac",
          "scenarioId": "REG-11",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per USR-01: fix the admin user-management route to return correct status/JSON for create/list/delete."
        }
      ],
      "functionalScore": 62,
      "summary": "16/26 pass. Sale creation 500; inventory GET returns undefined fields; REG-06 and REG-11 fail. RBAC view and basic auth gating work."
    },
    "build-vscode-glm-5.2": {
      "bootMode": "dev (drizzle-kit migrate + /api/setup fallback; seed script broken: missing dotenv)",
      "flows": [
        {
          "id": "auth",
          "status": "fail",
          "attempts": "7/8 tests pass",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "inventory",
          "status": "pass",
          "attempts": "6/6 tests pass",
          "error": ""
        },
        {
          "id": "sales",
          "status": "pass",
          "attempts": "5/5 tests pass",
          "error": ""
        },
        {
          "id": "import",
          "status": "pass",
          "attempts": "3/3 tests pass",
          "error": ""
        },
        {
          "id": "rbac",
          "status": "pass",
          "attempts": "4/4 tests pass",
          "error": ""
        }
      ],
      "regressions": [
        {
          "id": "REG-01",
          "scenario": "Create item → record sale → item status becomes \"sold\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-02",
          "scenario": "Record sale → process refund_with_return → item becomes \"returned\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-03",
          "scenario": "Record sale → process refund_no_return → item stays \"sold\", refund recorded",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-04",
          "scenario": "Delete sale → item status reverts to \"available\"",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-05",
          "scenario": "Bulk update items to \"donated\" → removalDate set, no $0 sales created",
          "category": "Functional",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-06",
          "scenario": "Password change invalidates existing JWT sessions",
          "category": "Auth",
          "priority": "Critical",
          "status": "fail",
          "error": "Error: expect(received).toContain(expected) // indexOf"
        },
        {
          "id": "REG-07",
          "scenario": "Origin header required on all POST/PUT/DELETE/PATCH requests",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-08",
          "scenario": "Origin header mismatched returns 403 INVALID_ORIGIN",
          "category": "Security",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-09",
          "scenario": "Standard user cannot access another user's items",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-10",
          "scenario": "canViewAll user can view all data but only edit own",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-11",
          "scenario": "Admin can manage users and edit any data",
          "category": "RBAC",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-12",
          "scenario": "Invalid status transition rejected (e.g., sold → available)",
          "category": "Validation",
          "priority": "Critical",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-13",
          "scenario": "Status transition to \"donated\" sets removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-14",
          "scenario": "Status transition \"returned\" → \"available\" clears removalDate",
          "category": "Business Logic",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-15",
          "scenario": "Backup restore with invalid data → no DB changes",
          "category": "Backup",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-16",
          "scenario": "Setup lock prevents second admin creation",
          "category": "Auth",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-17",
          "scenario": "Photo upload requires item ownership",
          "category": "Security",
          "priority": "High",
          "status": "pass",
          "error": ""
        },
        {
          "id": "REG-18",
          "scenario": "Profit calculation produces correct results for all null/zero combinations",
          "category": "Financial",
          "priority": "High",
          "status": "pass",
          "error": ""
        }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toContain(expected) // indexOf",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        }
      ],
      "functionalScore": 96,
      "summary": "25/26 pass. Only REG-06 fails (no live JWT refresh). seed.ts is broken (missing dotenv); /api/setup bootstraps the admin cleanly."
    },
    "build-pi-glm-5.2": {
      "bootMode": "dev (seed auto-migrates via runMigrations; AUTH_SECRET env required)",
      "flows": [
        { "id": "auth",      "status": "fail", "attempts": "10/11 tests pass", "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200" },
        { "id": "inventory", "status": "pass", "attempts": "6/6 tests pass",  "error": "" },
        { "id": "sales",     "status": "pass", "attempts": "5/5 tests pass",  "error": "" },
        { "id": "import",    "status": "pass", "attempts": "3/3 tests pass",  "error": "" },
        { "id": "rbac",      "status": "pass", "attempts": "4/4 tests pass",  "error": "" }
      ],
      "regressions": [
        { "id": "REG-01", "status": "pass", "error": "" },
        { "id": "REG-02", "status": "pass", "error": "" },
        { "id": "REG-03", "status": "pass", "error": "" },
        { "id": "REG-04", "status": "pass", "error": "" },
        { "id": "REG-05", "status": "pass", "error": "" },
        { "id": "REG-06", "status": "fail", "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200" },
        { "id": "REG-07", "status": "pass", "error": "" },
        { "id": "REG-08", "status": "pass", "error": "" },
        { "id": "REG-09", "status": "pass", "error": "" },
        { "id": "REG-10", "status": "pass", "error": "" },
        { "id": "REG-11", "status": "pass", "error": "" },
        { "id": "REG-12", "status": "pass", "error": "" },
        { "id": "REG-13", "status": "pass", "error": "" },
        { "id": "REG-14", "status": "pass", "error": "" },
        { "id": "REG-15", "status": "pass", "error": "" },
        { "id": "REG-16", "status": "pass", "error": "" },
        { "id": "REG-17", "status": "pass", "error": "" },
        { "id": "REG-18", "status": "pass", "error": "" }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toBe(expected) // Object.is equality | Expected: 401 | Received: 200",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        }
      ],
      "functionalScore": 96,
      "summary": "Co-runner-up (25/26 pass, tied with vscode-5.2 at 96/100). Only REG-06 fails (login-only JWT refresh — password change does not invalidate existing sessions). Every other flow passes: sale creation (no 500, unlike pi-5.1), status transitions, refunds, RBAC (incl. admin user management — REG-11 passes, unlike pi-5.1), CSV import (inventory + sales + mileage), and backup-restore validation. Seed works natively (no missing-dotenv crash) and auto-migrates via runMigrations(), but requires AUTH_SECRET env var and seeds only the admin (no standard user). Most-improved build in the cohort: +34 points over pi-5.1 (62→96)."
    },
    "build-codex-glm-5.2": {
      "bootMode": "dev (does not boot — src/proxy.ts exports `middleware` not `proxy`, the Next.js 16 required name; every route returns 500)",
      "flows": [
        { "id": "auth",      "status": "fail", "attempts": "0/0 (app did not boot)", "error": "HTTP 500 on every route — src/proxy.ts exports `middleware` not `proxy`; Next.js 16 cannot find the proxy function export" },
        { "id": "inventory", "status": "fail", "attempts": "0/0 (app did not boot)", "error": "HTTP 500 on every route — same boot error" },
        { "id": "sales",     "status": "fail", "attempts": "0/0 (app did not boot)", "error": "HTTP 500 on every route — same boot error" },
        { "id": "import",    "status": "fail", "attempts": "0/0 (app did not boot)", "error": "HTTP 500 on every route — same boot error" },
        { "id": "rbac",      "status": "fail", "attempts": "0/0 (app did not boot)", "error": "HTTP 500 on every route — same boot error" }
      ],
      "regressions": [
        { "id": "REG-01", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-02", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-03", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-04", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-05", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-06", "status": "fail", "error": "app did not boot (proxy export-name bug); static analysis confirms login-only JWT refresh, so REG-06 would fail even if boot were fixed" },
        { "id": "REG-07", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-08", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-09", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-10", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-11", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-12", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-13", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-14", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-15", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-16", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-17", "status": "fail", "error": "app did not boot (proxy export-name bug)" },
        { "id": "REG-18", "status": "fail", "error": "app did not boot (proxy export-name bug)" }
      ],
      "failures": [
        {
          "flowId": "boot",
          "scenarioId": "all",
          "error": "HTTP 500 on every route — src/proxy.ts exports `middleware` not `proxy`; Next.js 16 cannot find the proxy function export",
          "effort": "S",
          "prompt": "Fix src/proxy.ts per BUILD_PROMPT STEP 6: rename `export async function middleware` to `export async function proxy` (the Next.js 16 required name for src/proxy.ts)."
        },
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "(blocked by boot failure — inferred from static analysis: login-only JWT refresh)",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        }
      ],
      "functionalScore": 0,
      "summary": "New last place (0/100, 0/26 pass). The app does not boot — a single boot-blocking bug in src/proxy.ts (function exported as `middleware` instead of the Next.js 16 required `proxy`) causes HTTP 500 on every route, preventing any E2E test from running. This is the only build in the cohort that fails to boot. The seed script and migrations work, so the defect is purely the proxy function-name mismatch — a trivial one-line fix (rename `middleware` → `proxy`), but it was not patched (per the no-patching fidelity rule). Even if the boot bug were fixed, static analysis predicts REG-06 would still fail (login-only JWT refresh, same as pi-5.2/vscode-5.2/opencode-5.2/opencode-5.1/claude-5.1). The build ships all 5 e2e spec files and a playwright.config.ts, but none could be executed."
    },
    "build-opencode-minimax-m3": {
      "bootMode": "dev (AUTH_SECRET env required; seed.ts crashes: missing dotenv; admin via /api/setup fallback)",
      "flows": [
        { "id": "auth",      "status": "pass", "attempts": "3/3 tests pass", "error": "" },
        { "id": "inventory", "status": "pass", "attempts": "1/1 tests pass", "error": "" },
        { "id": "sales",     "status": "pass", "attempts": "1/1 tests pass", "error": "" },
        { "id": "import",    "status": "pass", "attempts": "1/1 tests pass", "error": "" },
        { "id": "rbac",      "status": "pass", "attempts": "1/1 tests pass", "error": "" }
      ],
      "regressions": [
        { "id": "REG-01", "status": "pass", "error": "" },
        { "id": "REG-02", "status": "pass", "error": "" },
        { "id": "REG-03", "status": "pass", "error": "" },
        { "id": "REG-04", "status": "pass", "error": "" },
        { "id": "REG-05", "status": "pass", "error": "" },
        { "id": "REG-06", "status": "fail", "error": "Error: expect(received).toBe(expected) | Expected: 401 | Received: 200" },
        { "id": "REG-07", "status": "pass", "error": "" },
        { "id": "REG-08", "status": "pass", "error": "" },
        { "id": "REG-09", "status": "pass", "error": "" },
        { "id": "REG-10", "status": "pass", "error": "" },
        { "id": "REG-11", "status": "pass", "error": "" },
        { "id": "REG-12", "status": "pass", "error": "" },
        { "id": "REG-13", "status": "pass", "error": "" },
        { "id": "REG-14", "status": "pass", "error": "" },
        { "id": "REG-15", "status": "pass", "error": "" },
        { "id": "REG-16", "status": "pass", "error": "" },
        { "id": "REG-17", "status": "pass", "error": "" },
        { "id": "REG-18", "status": "pass", "error": "" }
      ],
      "failures": [
        {
          "flowId": "auth",
          "scenarioId": "REG-06",
          "error": "Error: expect(received).toBe(expected) | Expected: 401 | Received: 200",
          "effort": "M",
          "prompt": "Fix per AUTH-02: refresh passwordChangedAt from DB in the jwt callback on every request so iat<pca rejects old sessions."
        }
      ],
      "functionalScore": 96,
      "summary": "Co-runner-up (24/25 pass, tied with pi-5.2 and vscode-5.2 at 96/100). Only REG-06 fails (login-only JWT refresh — password change does not invalidate existing sessions). All other flows pass: sale creation, status transitions, refunds (incl. refund_with_return setting returned), RBAC (admin user management — REG-11 passes), Origin/Referer validation, backup-restore validation, photo upload ownership. The seed.ts crashes (missing dotenv — same defect as opencode-5.2 and vscode-5.2), so admin created via /api/setup. AUTH_SECRET env var required. First build generated by a non-GLM model (MiniMax M3)."
    }
  },
  "crossBranchMatrix": null,
  "aggregateFindings": [
    {
      "sev": "High",
      "branch": "build-codex-glm-5.2",
      "finding": "App does not boot: src/proxy.ts exports `middleware` not `proxy`; Next.js 16 returns 500 on every route. All 5 flows and all 18 regression scenarios blocked.",
      "flowId": "boot",
      "scenarioId": "all flows + all REG-01..REG-18"
    },
    {
      "sev": "High",
      "branch": "build-claude-glm-5.1",
      "finding": "POST /api/sales and /api/inventory return HTTP 500 (broken creation handler)",
      "flowId": "sales/inventory",
      "scenarioId": "REG-01/REG-05/REG-12/REG-17/REG-18"
    },
    {
      "sev": "High",
      "branch": "build-opencode-glm-5.1",
      "finding": "POST /api/sales returns 500; sale workflow non-functional",
      "flowId": "sales",
      "scenarioId": "REG-01..REG-04/REG-18"
    },
    {
      "sev": "High",
      "branch": "build-pi-glm-5.1",
      "finding": "POST /api/sales returns 500; inventory GET returns undefined fields",
      "flowId": "sales/inventory",
      "scenarioId": "REG-01..REG-04/REG-13/REG-14/REG-18"
    },
    {
      "sev": "High",
      "branch": "build-opencode-glm-5.2, build-vscode-glm-5.2, build-opencode-minimax-m3",
      "finding": "seed.ts crashes: Cannot find module 'dotenv/config' (broken boot script)",
      "flowId": "boot",
      "scenarioId": "—"
    },
    {
      "sev": "Med",
      "branch": "build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2, build-codex-glm-5.2, build-opencode-minimax-m3",
      "finding": "REG-06 fails: jwt callback copies passwordChangedAt only at login — no live refresh (AUTH-02). codex-5.2 is blocked by boot, so its REG-06 failure is inferred from static analysis.",
      "flowId": "auth",
      "scenarioId": "REG-06"
    },
    {
      "sev": "Med",
      "branch": "build-claude-glm-5.1, build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1",
      "finding": "REG-11 fails: admin user-management endpoint returns wrong status/shape",
      "flowId": "rbac",
      "scenarioId": "REG-11"
    },
    {
      "sev": "Med",
      "branch": "build-opencode-glm-5.1",
      "finding": "REG-14 fails: refund_with_return leaves item in 'sold' state instead of 'returned'",
      "flowId": "inventory",
      "scenarioId": "REG-14"
    },
    {
      "sev": "Med",
      "branch": "build-opencode-glm-5.2",
      "finding": "Mileage CSV import (type=mileage) fails; inventory/sales imports work",
      "flowId": "import",
      "scenarioId": "—"
    },
    {
      "sev": "Low",
      "branch": "build-codex-glm-5.2",
      "finding": "Boot-blocking: src/proxy.ts exports `middleware` not `proxy` (Next.js 16 required name); trivial S-effort fix but unfixed, so app never reaches a booted state",
      "flowId": "boot",
      "scenarioId": "all flows"
    },
    {
      "sev": "Low",
      "branch": "build-claude-glm-5.2",
      "finding": "/api/setup POST throws 500 when drizzle-kit has run (tag column mismatch in custom migrator)",
      "flowId": "boot",
      "scenarioId": "—"
    },
    {
      "sev": "Low",
      "branch": "build-pi-glm-5.2, build-codex-glm-5.2, build-opencode-minimax-m3",
      "finding": "Requires AUTH_SECRET env var or NextAuth throws MissingSecret (no config default in dev)",
      "flowId": "boot",
      "scenarioId": "—"
    },
    {
      "sev": "Low",
      "branch": "build-opencode-glm-5.1, build-opencode-glm-5.2, build-pi-glm-5.1, build-vscode-glm-5.2",
      "finding": "App does not auto-migrate on dev boot; requires manual `npx drizzle-kit migrate` (OPERATIONS.md §1.3)",
      "flowId": "boot",
      "scenarioId": "—"
    },
    {
      "sev": "Info",
      "branch": "all branches except build-claude-glm-5.2",
      "finding": "Session invalidation (REG-06) is the single most-shared functional gap — only claude-5.2 implements live JWT refresh. codex-5.2 is blocked by boot, so its REG-06 failure is inferred from static analysis, not directly observed.",
      "flowId": "auth",
      "scenarioId": "REG-06"
    }
  ],
  "effortSummary": [
    {
      "branch": "build-claude-glm-5.2",
      "total": 0,
      "S": 0,
      "M": 0,
      "L": 0,
      "XL": 0,
      "estimatedHours": 0.0
    },
    {
      "branch": "build-claude-glm-5.1",
      "total": 17,
      "S": 1,
      "M": 16,
      "L": 0,
      "XL": 0,
      "estimatedHours": 16.2
    },
    {
      "branch": "build-opencode-glm-5.1",
      "total": 8,
      "S": 1,
      "M": 7,
      "L": 0,
      "XL": 0,
      "estimatedHours": 7.2
    },
    {
      "branch": "build-opencode-glm-5.2",
      "total": 3,
      "S": 1,
      "M": 2,
      "L": 0,
      "XL": 0,
      "estimatedHours": 2.2
    },
    {
      "branch": "build-pi-glm-5.1",
      "total": 10,
      "S": 2,
      "M": 8,
      "L": 0,
      "XL": 0,
      "estimatedHours": 8.5
    },
    {
      "branch": "build-pi-glm-5.2",
      "total": 1,
      "S": 0,
      "M": 1,
      "L": 0,
      "XL": 0,
      "estimatedHours": 1.0
    },
    {
      "branch": "build-vscode-glm-5.2",
      "total": 1,
      "S": 0,
      "M": 1,
      "L": 0,
      "XL": 0,
      "estimatedHours": 1.0
    },
    {
      "branch": "build-codex-glm-5.2",
      "total": 2,
      "S": 1,
      "M": 1,
      "L": 0,
      "XL": 0,
      "estimatedHours": 2.0
    },
    {
      "branch": "build-opencode-minimax-m3",
      "total": 1,
      "S": 0,
      "M": 1,
      "L": 0,
      "XL": 0,
      "estimatedHours": 1.0
    }
  ],
  "functionalWinner": "build-claude-glm-5.2",
  "recommendation": "build-claude-glm-5.2 is the only build that passes the full functional E2E suite (26/26, 100/100) — the only build with working session invalidation (REG-06), non-500 sale creation, and working admin user management. Corroborates the static-analysis #1 ranking. Co-runner-ups: build-pi-glm-5.2, build-vscode-glm-5.2, and build-opencode-minimax-m3 (all 96/100, failing only REG-06). opencode-minimax-m3 is the first build generated by a non-GLM model (MiniMax M3). Adopt claude-5.2 as the production baseline.",
  "appendix": "Raw reports: /tmp/opencode/eval-func/<branch>/results-run-{1,2,3}/. Per-run logs: /tmp/opencode/eval-func/<branch>-run-{1,2,3}.log. Dev logs: /tmp/opencode/eval-func/<branch>-dev.log. codex-5.2 produced no Playwright reports (app did not boot); only the dev-server log and seed output were captured."
}
};
