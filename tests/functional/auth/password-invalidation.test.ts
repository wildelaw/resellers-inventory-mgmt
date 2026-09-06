import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { setupTestDb } from '../../setup/db';
import { mockSession } from '../../setup/session';
import { jsonRequest } from '../../setup/request';

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

let db: Awaited<ReturnType<typeof setupTestDb>>['db'];
let profileRoute: typeof import('@/app/api/profile/route');
let wrapped: typeof import('@/lib/api-utils');
let counter = 0;

beforeAll(async () => {
  const t = await setupTestDb();
  db = t.db;
  profileRoute = await import('@/app/api/profile/route');
  wrapped = await import('@/lib/api-utils');
});

beforeEach(async () => {
  const { auth } = await import('@/lib/auth');
  vi.mocked(auth).mockReset();
});

async function createUser(passwordChangedAt = 0): Promise<{ id: number; passwordHash: string }> {
  const { users } = await import('@/lib/schema');
  counter++;
  const [row] = await db.insert(users).values({
    email: `user${counter}@inv.test`,
    passwordHash: await bcrypt.hash('OldPass!123', 4),
    name: `User ${counter}`,
    role: 'user',
    canViewAll: false,
    isActive: true,
    passwordChangedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  return { id: row.id, passwordHash: row.passwordHash };
}

// A trivial handler wrapped in withAuth — the observable is the status code.
function probe() {
  return wrapped.withAuth(async () => new Response(null, { status: 200 }));
}

describe('session invalidation via passwordChangedAt (REG-06)', () => {
  it('JWT issued before the password change is rejected with 401', async () => {
    const { auth } = await import('@/lib/auth');
    const changedAt = Math.floor(Date.now() / 1000);
    const user = await createUser(changedAt);
    vi.mocked(auth).mockResolvedValue(
      mockSession({ id: user.id, iat: changedAt - 100, passwordChangedAt: changedAt }) as never
    );

    const res = await probe()(
      jsonRequest('http://localhost:3000/api/profile', 'GET')
    );
    expect(res.status).toBe(401);
  });

  it('JWT issued after the password change is accepted', async () => {
    const { auth } = await import('@/lib/auth');
    const changedAt = Math.floor(Date.now() / 1000);
    const user = await createUser(changedAt);
    vi.mocked(auth).mockResolvedValue(
      mockSession({ id: user.id, iat: changedAt + 100, passwordChangedAt: changedAt }) as never
    );

    const res = await probe()(
      jsonRequest('http://localhost:3000/api/profile', 'GET')
    );
    expect(res.status).toBe(200);
  });

  it('sessions are accepted when passwordChangedAt is 0 (never changed)', async () => {
    const { auth } = await import('@/lib/auth');
    const user = await createUser(0);
    vi.mocked(auth).mockResolvedValue(
      mockSession({ id: user.id, iat: Math.floor(Date.now() / 1000) - 100000 }) as never
    );
    const res = await probe()(jsonRequest('http://localhost:3000/api/profile', 'GET'));
    expect(res.status).toBe(200);
  });

  it('changing the password updates passwordChangedAt and invalidates older JWTs', async () => {
    const { auth } = await import('@/lib/auth');
    const user = await createUser(0);
    const oldIat = Math.floor(Date.now() / 1000) - 500;
    vi.mocked(auth).mockResolvedValue(
      // Pre-change session: passwordChangedAt refreshed from the DB would be 0
      mockSession({ id: user.id, iat: oldIat }) as never
    );

    // Before the change: old JWT works
    const before = await profileRoute.PUT(
      jsonRequest('http://localhost:3000/api/profile', 'PUT', {
        type: 'password',
        currentPassword: 'OldPass!123',
        newPassword: 'N3w!Passw0rd',
      })
    );
    expect(before.status).toBe(200);

    const { users } = await import('@/lib/schema');
    const [updated] = await db.select().from(users).where(eq(users.id, user.id));
    expect(updated.passwordChangedAt).toBeGreaterThan(0);

    // The now-stale JWT (iat < passwordChangedAt) is rejected
    vi.mocked(auth).mockResolvedValue(
      mockSession({ id: user.id, iat: oldIat, passwordChangedAt: updated.passwordChangedAt }) as never
    );
    const stale = await probe()(jsonRequest('http://localhost:3000/api/profile', 'GET'));
    expect(stale.status).toBe(401);

    // A JWT issued after the change is accepted
    vi.mocked(auth).mockResolvedValue(
      mockSession({ id: user.id, iat: updated.passwordChangedAt + 1, passwordChangedAt: updated.passwordChangedAt }) as never
    );
    const fresh = await probe()(jsonRequest('http://localhost:3000/api/profile', 'GET'));
    expect(fresh.status).toBe(200);
  });

  it('rejects password change when the current password is wrong', async () => {
    const { auth } = await import('@/lib/auth');
    const user = await createUser(0);
    vi.mocked(auth).mockResolvedValue(mockSession({ id: user.id }) as never);

    const res = await profileRoute.PUT(
      jsonRequest('http://localhost:3000/api/profile', 'PUT', {
        type: 'password',
        currentPassword: 'WrongPass!1',
        newPassword: 'N3w!Passw0rd',
      })
    );
    expect(res.status).toBe(400);
  });
});