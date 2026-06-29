import { db } from './db';
import { appConfig, users } from './schema';
import { eq } from 'drizzle-orm';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  setupComplete: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  // Ensure app_config row exists
  const cfg = await ensureAppConfigRow();
  const userCount = await db.$count(users);
  const hasUsers = userCount > 0;
  const needsSetup = !cfg.setupComplete && !hasUsers;
  return { needsSetup, hasUsers, setupComplete: cfg.setupComplete };
}

export async function markSetupComplete(): Promise<void> {
  const now = Date.now();
  const existing = db.select().from(appConfig).where(eq(appConfig.id, 1)).get();
  if (existing) {
    db.update(appConfig)
      .set({ setupComplete: true, updatedAt: now })
      .where(eq(appConfig.id, 1))
      .run();
  } else {
    db.insert(appConfig)
      .values({ id: 1, setupComplete: true, updatedAt: now })
      .run();
  }
}

export async function unlockSetup(): Promise<void> {
  const now = Date.now();
  const existing = db.select().from(appConfig).where(eq(appConfig.id, 1)).get();
  if (existing) {
    db.update(appConfig)
      .set({ setupComplete: false, updatedAt: now })
      .where(eq(appConfig.id, 1))
      .run();
  } else {
    db.insert(appConfig)
      .values({ id: 1, setupComplete: false, updatedAt: now })
      .run();
  }
}

export async function ensureAppConfigRow() {
  let row = db.select().from(appConfig).where(eq(appConfig.id, 1)).get();
  if (!row) {
    db.insert(appConfig)
      .values({ id: 1, updatedAt: Date.now() })
      .run();
    row = db.select().from(appConfig).where(eq(appConfig.id, 1)).get();
  }
  return row!;
}