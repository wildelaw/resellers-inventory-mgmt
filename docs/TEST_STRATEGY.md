# Resell Inventory Manager — Test Strategy

> **Version:** 2.0  
> **Date:** 2026-06-12  
> **Purpose:** Simplified test strategy for the Resell Inventory Manager application.

---

## 1. Testing Philosophy

- **Test real behavior, not implementation details.** Functional and integration tests use a real SQLite database with real migrations, not mocks.
- **Isolate test data.** Each test suite gets its own timestamped database that is cleaned up after the suite.
- **Test at the right level.** Pure logic in unit tests, DB operations in functional tests, full request/response in integration tests, user workflows in E2E tests.
- **Never mock what you own.** Use real DB, real bcrypt, real migrations. Only mock external dependencies (none currently).

---

## 2. Test Categories

### 2.1 Unit Tests

**Location:** `tests/unit/`

**Files:**
| File | What It Tests |
|------|--------------|
| `constants.test.ts` | `isValidTransition()`, `getAllowedTransitions()`, status labels, role labels |
| `financial.test.ts` | `calculateProfit()`, `calculateNetRevenue()`, `calculateSalesTaxFromPrice()` with null/zero inputs |
| `api-utils.test.ts` | `validateOriginOrReferer()` — Origin match/mismatch/missing, Referer fallback, method filtering, auth exemption |
| `validations.test.ts` | All Zod schemas including `canViewAll` field |
| `validation-security.test.ts` | XSS in strings, SQL injection patterns, oversized inputs, negative prices |
| `api-auth.test.ts` | `canViewAllData()`, `canEditOthersData()`, `canManageUsers()` for admin, user+canViewAll, user |
| `csv-parser.test.ts` | CSV parsing, column mapping, fuzzy matching |

**Removed from v1:**
| File | Reason |
|------|--------|
| `csrf.test.ts` | CSRF token module removed |
| `rate-limit.test.ts` | Rate limiting moved to Caddy |
| `api-middleware.test.ts` | Middleware module removed |

### 2.2 Functional Tests

**Location:** `tests/functional/`

**Files:**
| File | What It Tests |
|------|--------------|
| `workflows/status-transitions.test.ts` | All valid and invalid status transitions; side effects (removalDate set/cleared) |
| `workflows/sale-refund-flow.test.ts` | Sale creation updates item status; refund_with_return → item becomes returned; refund_no_return → item stays sold |
| `workflows/inventory-removal-date.test.ts` | removalDate auto-set on donated/discarded; cleared on returned→available |
| `financial/refund-impact.test.ts` | Refund amounts correctly reduce profit; different refund types produce different item statuses |
| `auth/setup-lock.test.ts` | Setup locked after admin creation; POST /api/setup returns 403 after lock; POST /api/admin/setup-unlock re-opens |
| `auth/password-invalidation.test.ts` | Password change updates passwordChangedAt; JWTs with iat < passwordChangedAt are rejected; JWTs with iat > passwordChangedAt are accepted |
| `backup/restore-validation.test.ts` | Valid backup restores correctly; invalid roles rejected; invalid enum values rejected; restore is atomic |

**Removed from v1:**
| File | Reason |
|------|--------|
| `auth/account-lockout.test.ts` | Account lockout feature removed |
| `auth/session-revocation.test.ts` | Session revocation table removed; replaced by passwordChangedAt |
| `financial/profit-consistency.test.ts` | Single source of truth — no SQL formula to match |

### 2.3 Integration Tests

**Location:** `tests/integration/api/`

**Files:**
| File | What It Tests |
|------|--------------|
| `inventory/route.test.ts` | GET (list, filter, sort, pagination, RBAC), POST (create, validation) |
| `inventory/[id].test.ts` | GET (single item, 404, RBAC), PUT (update, status transitions, RBAC), DELETE (RBAC) |
| `inventory/bulk/route.test.ts` | PATCH (bulk status update, validation), DELETE (bulk delete, RBAC) |
| `sales/route.test.ts` | GET (list, filter, sort, RBAC), POST (create with/without item, validation) |
| `sales/[id].test.ts` | GET (single sale, RBAC), PUT (update, RBAC), DELETE (with item status revert) |
| `reports.test.ts` | GET (all stats, date filtering, RBAC) |
| `import.test.ts` | POST (inventory, sales, mileage import, validation, fuzzy matching) |
| `authorization.test.ts` | RBAC: user sees own data, canViewAll user sees all, admin can do everything |
| `origin-validation.test.ts` | Origin/Referer validation on state-changing requests |

**Removed from v1:**
| File | Reason |
|------|--------|
| `csrf-token.test.ts` | CSRF token endpoint removed |

### 2.4 End-to-End (E2E) Tests

**Location:** `tests/e2e/`

**Files:**
| File | What It Tests |
|------|--------------|
| `auth.spec.ts` | Login flow, logout, redirect to login when unauthenticated |
| `import.spec.ts` | CSV upload workflow for inventory and sales |
| `inventory.spec.ts` | CRUD operations for inventory items |
| `sales.spec.ts` | Sale creation and refund workflow |
| `rbac.spec.ts` | Role-based access: user sees own data, canViewAll user sees all, admin can manage |

**Removed from v1:**
| File | Reason |
|------|--------|
| `auth/auth-flow.test.ts` | Merged into `auth.spec.ts` |
| `sales/sale-create.test.ts` | Merged into `sales.spec.ts` |
| `sales/sales-list.test.ts` | Merged into `sales.spec.ts` |
| `rbac/rbac-access.spec.ts` | Simplified for 2 roles + canViewAll |
| `user-management/user-management.spec.ts` | Merged into `rbac.spec.ts` |

---

## 3. Test Infrastructure

### 3.1 Configuration

**Vitest config** (`vitest.config.ts`): Same as v1 (environment: jsdom, pool: forks, singleFork: true).

**Playwright config** (`playwright.config.ts`): Same as v1 (base URL: http://localhost:3000).

### 3.2 Database Setup (`tests/setup/db.ts`)

Same pattern as v1 — each suite creates a unique timestamped database, runs migrations, and cleans up after.

### 3.3 Session Mocking

Updated for v2 schema — mock sessions include `canViewAll` and `iat` fields:

```typescript
export function mockSession(overrides?: Partial<SessionUser>) {
  return {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as UserRole,
    canViewAll: false,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}
```

---

## 4. Critical Test Scenarios

### 4.1 Must-Pass Scenarios (Regression Suite)

| ID | Scenario | Category | Priority |
|-----|----------|----------|----------|
| REG-01 | Create item → record sale → item status becomes "sold" | Functional | Critical |
| REG-02 | Record sale → process refund_with_return → item becomes "returned" | Functional | Critical |
| REG-03 | Record sale → process refund_no_return → item stays "sold", refund recorded | Functional | Critical |
| REG-04 | Delete sale → item status reverts to "available" | Functional | Critical |
| REG-05 | Bulk update items to "donated" → removalDate set, no $0 sales created | Functional | Critical |
| REG-06 | Password change invalidates existing JWT sessions | Auth | Critical |
| REG-07 | Origin header required on all POST/PUT/DELETE/PATCH requests | Security | Critical |
| REG-08 | Origin header mismatched returns 403 INVALID_ORIGIN | Security | Critical |
| REG-09 | Standard user cannot access another user's items | RBAC | Critical |
| REG-10 | canViewAll user can view all data but only edit own | RBAC | Critical |
| REG-11 | Admin can manage users and edit any data | RBAC | Critical |
| REG-12 | Invalid status transition rejected (e.g., sold → available) | Validation | Critical |
| REG-13 | Status transition to "donated" sets removalDate | Business Logic | High |
| REG-14 | Status transition "returned" → "available" clears removalDate | Business Logic | High |
| REG-15 | Backup restore with invalid data → no DB changes | Backup | High |
| REG-16 | Setup lock prevents second admin creation | Auth | High |
| REG-17 | Photo upload requires item ownership | Security | High |
| REG-18 | Profit calculation produces correct results for all null/zero combinations | Financial | High |

### 4.2 Origin/Referer Validation Test

```typescript
describe('validateOriginOrReferer', () => {
  it('allows matching Origin header', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://example.com', host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });

  it('rejects mismatched Origin header', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST',
      headers: { origin: 'https://evil.com', host: 'example.com' },
    });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('rejects missing Origin and Referer on mutations', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'POST',
      headers: { host: 'example.com' },
    });
    const result = validateOriginOrReferer(req);
    expect(result?.status).toBe(403);
  });

  it('skips check for GET requests', () => {
    const req = new NextRequest('https://example.com/api/inventory', {
      method: 'GET',
      headers: { host: 'example.com' },
    });
    expect(validateOriginOrReferer(req)).toBeNull();
  });
});
```

### 4.3 Session Invalidation Test

```typescript
describe('Session invalidation via passwordChangedAt', () => {
  it('rejects JWT issued before password change', async () => {
    const user = await createUser({ passwordChangedAt: Date.now() / 1000 });
    const token = createToken({ iat: user.passwordChangedAt - 100 }); // issued before change
    const result = await withAuth(handler)(req, ctx);
    expect(result.status).toBe(401);
  });

  it('accepts JWT issued after password change', async () => {
    const user = await createUser({ passwordChangedAt: Date.now() / 1000 });
    const token = createToken({ iat: user.passwordChangedAt + 100 }); // issued after change
    const result = await withAuth(handler)(req, ctx);
    expect(result.status).toBe(200);
  });
});
```

### 4.4 RBAC Tests (Simplified)

```typescript
describe('RBAC', () => {
  it('standard user can only see own data', async () => { ... });
  it('canViewAll user can see all data but only edit own', async () => { ... });
  it('admin can see and edit all data', async () => { ... });
  it('admin can manage users', async () => { ... });
  it('canViewAll user cannot manage users', async () => { ... });
  it('canViewAll user cannot edit others data', async () => { ... });
});
```

---

## 5. Coverage Expectations

### 5.1 Minimum Coverage Targets

| Category | Target |
|----------|--------|
| Unit Tests | 90%+ of pure logic |
| Functional Tests | All workflows and status transitions |
| Integration Tests | All API routes with auth, validation, RBAC |
| E2E Tests | Critical user paths |

### 5.2 What Must Be Covered

- Every API endpoint has at least one integration test for success and one for auth failure
- Every Zod schema has unit tests for valid and invalid inputs
- Every status transition has a functional test (both valid and invalid)
- Every RBAC rule has an integration test for each role combination
- Origin/Referer validation has unit tests for match, mismatch, missing, and exempt routes
- Session invalidation (passwordChangedAt) has functional tests

### 5.3 What Does Not Need Tests

- Third-party library internals (NextAuth, Drizzle ORM, bcrypt)
- CSS/styling
- Next.js framework behavior
- Rate limiting (handled by Caddy, tested at infrastructure level)
- CSRF token generation/validation (replaced by Origin/Referer check)

---

## 6. Running Tests

```bash
npm run test              # All unit + functional + integration
npm run test:watch        # Watch mode
npm run test:functional   # Functional tests only
npm run test:all          # All tests including E2E setup
npm run test:e2e          # E2E tests (requires dev server)
npm run test -- --coverage  # Coverage report
```

---

## 7. CI Integration

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 25
      - run: npm ci
      - run: npm run test:all
      - run: npm run lint

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 25
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run dev &
      - run: sleep 10
      - run: npx tsx src/scripts/seed.ts
      - run: npm run test:e2e
```