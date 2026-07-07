import { db } from './db';
import { users, appConfig } from './schema';
import { eq, sql } from 'drizzle-orm';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  setupComplete: boolean;
}

/**
 * Check if the application needs initial setup.
 * Returns true if no users exist AND setup is not locked.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const allUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const userCount = allUsers[0]?.count ?? 0;

    let setupComplete = false;
    try {
      const cfg = await db.select().from(appConfig).limit(1);
      setupComplete = cfg[0]?.setupComplete ?? false;
    } catch {
      // app_config table might not exist yet
      setupComplete = false;
    }

    const hasUsers = userCount > 0;
    const needsSetup = !hasUsers && !setupComplete;

    return { needsSetup, hasUsers, setupComplete };
  } catch (error) {
    // If database doesn't exist or migrations haven't run, setup is needed
    return { needsSetup: true, hasUsers: false, setupComplete: false };
  }
}

/**
 * Ensure the app_config row exists (creates default if not).
 */
export async function ensureAppConfig(): Promise<void> {
  const existing = await db.select().from(appConfig).limit(1);
  if (existing.length === 0) {
    await db.insert(appConfig).values({
      updatedAt: Math.floor(Date.now() / 1000),
    });
  }
}

/**
 * Lock the setup by setting setup_complete to true.
 */
export async function lockSetup(): Promise<void> {
  await ensureAppConfig();
  await db.update(appConfig)
    .set({ setupComplete: true, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(appConfig.id, 1));
}

/**
 * Unlock the setup by setting setup_complete to false.
 */
export async function unlockSetup(): Promise<void> {
  await ensureAppConfig();
  await db.update(appConfig)
    .set({ setupComplete: false, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(appConfig.id, 1));
}