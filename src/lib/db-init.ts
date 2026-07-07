import { eq, sql } from 'drizzle-orm';
import { db, getSqlite } from './db';
import { users, appConfig } from './schema';

/**
 * Determine whether the application needs initial setup.
 * Setup is needed when no users exist OR setup_complete is false.
 */
export async function getSetupStatus(): Promise<{ needsSetup: boolean; hasUsers: boolean }> {
  // Ensure the app_config row exists.
  await ensureAppConfigRow();

  const allUsers = await db.select({ id: users.id }).from(users).limit(1);
  const hasUsers = allUsers.length > 0;

  const cfg = await db.query.appConfig.findFirst();
  const setupComplete = cfg?.setupComplete ?? false;

  return { needsSetup: !hasUsers || !setupComplete, hasUsers };
}

/** Ensure the single app_config row exists (id = 1). */
export async function ensureAppConfigRow(): Promise<void> {
  const existing = await db.query.appConfig.findFirst();
  if (!existing) {
    db.insert(appConfig).values({ id: 1 }).onConflictDoNothing().run();
  }
}

/** Mark setup as complete (lock the setup endpoint). */
export async function lockSetup(): Promise<void> {
  await ensureAppConfigRow();
  db.update(appConfig)
    .set({ setupComplete: true, updatedAt: sql`(unixepoch())` })
    .where(eq(appConfig.id, 1))
    .run();
}

/** Re-open setup (admin action). */
export async function unlockSetup(): Promise<void> {
  await ensureAppConfigRow();
  db.update(appConfig)
    .set({ setupComplete: false, updatedAt: sql`(unixepoch())` })
    .where(eq(appConfig.id, 1))
    .run();
}

/** Expose the raw sqlite handle for the migration runner. */
export function getRawSqlite() {
  return getSqlite();
}
