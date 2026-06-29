/**
 * Setup-status detection using the app_config single-row table.
 * Ensures migrations and the app_config row exist before reporting status.
 */
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { appConfig, users, toBool, nowTs } from './schema';
import { runMigrationsIfDue } from './migrate';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  setupComplete: boolean;
}

/** Ensure migrations have been applied (idempotent). */
async function ensureSchema(): Promise<void> {
  await runMigrationsIfDue();
  // Ensure the single app_config row exists.
  const existing = db.select().from(appConfig).where(eq(appConfig.id, 1)).all();
  if (existing.length === 0) {
    db.insert(appConfig)
      .values({ id: 1, updatedAt: nowTs() })
      .onConflictDoNothing()
      .run();
  }
}

/**
 * Determine whether initial setup is required.
 * Setup is required when there are no users AND setup_complete is false.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  await ensureSchema();
  const row = db.select().from(appConfig).where(eq(appConfig.id, 1)).all()[0];
  const userCount = db.select({ c: sql<number>`count(*)` }).from(users).get();
  const hasUsers = (userCount?.c ?? 0) > 0;
  const setupComplete = row ? toBool(row.setupComplete) : false;
  return {
    needsSetup: !hasUsers && !setupComplete,
    hasUsers,
    setupComplete,
  };
}

/** Mark setup complete (lock). */
export function lockSetup(): void {
  db.update(appConfig)
    .set({ setupComplete: 1, updatedAt: nowTs() })
    .where(eq(appConfig.id, 1))
    .run();
}

/** Re-open setup (admin action). */
export function unlockSetup(): void {
  db.update(appConfig)
    .set({ setupComplete: 0, updatedAt: nowTs() })
    .where(eq(appConfig.id, 1))
    .run();
}