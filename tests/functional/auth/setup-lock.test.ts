import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, cleanupTestDb, getTestDb } from '../../setup/db';
import { users, appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';

describe('setup lock', () => {
  beforeEach(() => createTestDb());
  afterEach(() => cleanupTestDb());

  it('setup is needed when no users exist', async () => {
    const db = getTestDb();
    const cfg = db.query.appConfig.findFirst();
    const allUsers = db.select().from(users).all();
    expect(allUsers).toHaveLength(0);
    expect(cfg?.setupComplete ?? false).toBe(false);
  });

  it('setup_complete locks after admin creation', async () => {
    const db = getTestDb();
    db.insert(appConfig).values({ id: 1, setupComplete: true }).run();
    const cfg = db.query.appConfig.findFirst();
    expect(cfg!.setupComplete).toBe(true);
  });

  it('setup-unlock re-opens setup', async () => {
    const db = getTestDb();
    db.insert(appConfig).values({ id: 1, setupComplete: true }).run();
    db.update(appConfig).set({ setupComplete: false }).where(eq(appConfig.id, 1)).run();
    const cfg = db.query.appConfig.findFirst();
    expect(cfg!.setupComplete).toBe(false);
  });
});
