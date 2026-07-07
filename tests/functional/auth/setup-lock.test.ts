import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { users, appConfig } from '../../../src/lib/schema';
import { nowTimestamp } from '../../../src/lib/utils';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/lib/schema';

let db: BetterSQLite3Database<typeof schema>;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  cleanupTestDb(db);
});

describe('Setup Lock', () => {
  it('starts with no users and setup not locked', async () => {
    const allUsers = await db.select().from(users);
    expect(allUsers).toHaveLength(0);

    // Ensure app_config exists
    const now = nowTimestamp();
    await db.insert(appConfig).values({ updatedAt: now });

    const config = await db.select().from(appConfig).limit(1);
    expect(config[0]?.setupComplete).toBe(false);
  });

  it('locks setup after admin creation', async () => {
    const now = nowTimestamp();
    await db.insert(users).values({
      email: 'admin@example.com',
      passwordHash: 'hash',
      name: 'Admin',
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    });

    await db.update(appConfig)
      .set({ setupComplete: true, updatedAt: now })
      .where(eq(appConfig.id, 1));

    const config = await db.select().from(appConfig).limit(1);
    expect(config[0]?.setupComplete).toBe(true);
  });

  it('can unlock setup', async () => {
    const now = nowTimestamp();
    await db.update(appConfig)
      .set({ setupComplete: false, updatedAt: now })
      .where(eq(appConfig.id, 1));

    const config = await db.select().from(appConfig).limit(1);
    expect(config[0]?.setupComplete).toBe(false);
  });
});