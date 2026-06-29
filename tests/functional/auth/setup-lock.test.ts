import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDbHandle } from '../../setup/db';
import { getSetupStatus, markSetupComplete, unlockSetup } from '@/lib/db-init';

let handle: TestDbHandle;

function now() { return Date.now(); }

describe('setup lock', () => {
  beforeAll(() => {
    handle = createTestDb();
  });

  afterAll(() => handle.cleanup());

  it('starts needing setup', async () => {
    const s = await getSetupStatus();
    expect(s.needsSetup).toBe(true);
    expect(s.hasUsers).toBe(false);
    expect(s.setupComplete).toBe(false);
  });

  it('creating first admin marks setup complete', async () => {
    const t = now();
    db.insert(users).values({
      email: 'admin@test.com', passwordHash: 'x', name: 'Admin',
      role: 'admin', canViewAll: true, createdAt: t, updatedAt: t,
    }).run();
    await markSetupComplete();
    const s = await getSetupStatus();
    expect(s.setupComplete).toBe(true);
    expect(s.hasUsers).toBe(true);
    expect(s.needsSetup).toBe(false);
  });

  it('after lock, needsSetup stays false even with no users', async () => {
    // setupComplete is true, so needsSetup is false regardless
    const s = await getSetupStatus();
    expect(s.needsSetup).toBe(false);
  });

  it('admin can re-open setup via unlockSetup', async () => {
    await unlockSetup();
    const s = await getSetupStatus();
    expect(s.setupComplete).toBe(false);
    // hasUsers is still true, so needsSetup is still false
    expect(s.needsSetup).toBe(false);
  });
});