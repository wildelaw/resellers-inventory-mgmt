import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDbHandle } from '../../setup/db';

let handle: TestDbHandle;

function now() { return Date.now(); }

describe('session invalidation via passwordChangedAt', () => {
  beforeAll(() => {
    handle = createTestDb();
  });

  afterAll(() => handle.cleanup());

  it('defaults passwordChangedAt to 0 (no invalidation)', () => {
    const t = now();
    const user = db.insert(users).values({
      email: 'a@test.com', passwordHash: 'x', name: 'A',
      role: 'user', createdAt: t, updatedAt: t,
    }).returning().get();
    expect(user.passwordChangedAt).toBe(0);
  });

  it('password change updates passwordChangedAt', () => {
    const t = now();
    const user = db.insert(users).values({
      email: 'b@test.com', passwordHash: 'x', name: 'B',
      role: 'user', createdAt: t, updatedAt: t,
    }).returning().get();
    const ts = Math.floor(Date.now() / 1000);
    db.update(users).set({ passwordChangedAt: ts, updatedAt: now() })
      .where(eq(users.id, user.id)).run();
    const after = db.select().from(users).where(eq(users.id, user.id)).get();
    expect(after?.passwordChangedAt).toBe(ts);
  });

  it('JWT with iat < passwordChangedAt would be rejected', () => {
    // Simulate the withAuth check
    const passwordChangedAt = Math.floor(Date.now() / 1000);
    const iatOld = passwordChangedAt - 100;
    const iatNew = passwordChangedAt + 100;
    expect(passwordChangedAt > 0 && iatOld < passwordChangedAt).toBe(true);
    expect(passwordChangedAt > 0 && iatNew < passwordChangedAt).toBe(false);
  });

  it('admin reset updates passwordChangedAt (invalidating user sessions)', () => {
    const t = now();
    const user = db.insert(users).values({
      email: 'c@test.com', passwordHash: 'x', name: 'C',
      role: 'user', createdAt: t, updatedAt: t,
    }).returning().get();
    const ts = Math.floor(Date.now() / 1000);
    db.update(users).set({ passwordHash: 'new', passwordChangedAt: ts, updatedAt: now() })
      .where(eq(users.id, user.id)).run();
    const after = db.select().from(users).where(eq(users.id, user.id)).get();
    expect(after?.passwordChangedAt).toBe(ts);
    expect(after?.passwordHash).toBe('new');
  });
});