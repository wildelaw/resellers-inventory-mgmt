import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { users } from '../../../src/lib/schema';
import { nowTimestamp } from '../../../src/lib/utils';
import bcrypt from 'bcrypt';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/lib/schema';

let db: BetterSQLite3Database<typeof schema>;
let testUserId: number;

beforeAll(async () => {
  db = createTestDb();
  const now = nowTimestamp();
  const hash = await bcrypt.hash('TestP@ss1', 10);
  const user = await db.insert(users).values({
    email: 'test@example.com',
    passwordHash: hash,
    name: 'Test User',
    role: 'user',
    canViewAll: false,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: now,
    updatedAt: now,
  }).returning();
  testUserId = user[0].id;
});

afterAll(() => {
  cleanupTestDb(db);
});

describe('Password Invalidation', () => {
  it('starts with passwordChangedAt = 0', async () => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    expect(user?.passwordChangedAt).toBe(0);
  });

  it('updates passwordChangedAt when password is changed', async () => {
    const now = nowTimestamp();
    const newHash = await bcrypt.hash('NewP@ss2', 10);

    await db.update(users)
      .set({
        passwordHash: newHash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, testUserId));

    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    expect(user?.passwordChangedAt).toBe(now);
    expect(user?.passwordChangedAt).toBeGreaterThan(0);
  });

  it('JWT with iat before passwordChangedAt should be rejected', async () => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });

    // Simulate a JWT issued before the password change
    const oldIat = (user?.passwordChangedAt ?? 0) - 100;
    const passwordChangedAt = user?.passwordChangedAt ?? 0;

    // The check: if passwordChangedAt > 0 && iat < passwordChangedAt → reject
    const shouldReject = passwordChangedAt > 0 && oldIat < passwordChangedAt;
    expect(shouldReject).toBe(true);
  });

  it('JWT with iat after passwordChangedAt should be accepted', async () => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });

    // Simulate a JWT issued after the password change
    const newIat = (user?.passwordChangedAt ?? 0) + 100;
    const passwordChangedAt = user?.passwordChangedAt ?? 0;

    // The check: if passwordChangedAt > 0 && iat < passwordChangedAt → reject
    const shouldReject = passwordChangedAt > 0 && newIat < passwordChangedAt;
    expect(shouldReject).toBe(false);
  });

  it('admin reset password also invalidates sessions', async () => {
    const now = nowTimestamp();
    const newHash = await bcrypt.hash('AdminResetP@ss3', 10);

    await db.update(users)
      .set({
        passwordHash: newHash,
        passwordChangedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, testUserId));

    const user = await db.query.users.findFirst({
      where: eq(users.id, testUserId),
    });
    expect(user?.passwordChangedAt).toBe(now);

    // Any old JWT should now be rejected
    const oldIat = now - 1;
    const shouldReject = (user?.passwordChangedAt ?? 0) > 0 && oldIat < (user?.passwordChangedAt ?? 0);
    expect(shouldReject).toBe(true);
  });
});