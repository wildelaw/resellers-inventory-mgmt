import { db } from './db';
import { appConfig, users } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Check if the application needs initial setup.
 * Returns true if no users exist and setup is not complete.
 */
export async function getSetupStatus(): Promise<{ needsSetup: boolean; hasUsers: boolean }> {
  try {
    const allUsers = await db.select({ id: users.id }).from(users).limit(1);
    const hasUsers = allUsers.length > 0;

    if (!hasUsers) {
      return { needsSetup: true, hasUsers: false };
    }

    // Check app_config for setup lock
    const config = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
    const setupComplete = config.length > 0 && config[0].setupComplete === 1;

    return { needsSetup: !setupComplete, hasUsers };
  } catch {
    // If tables don't exist yet, setup is needed
    return { needsSetup: true, hasUsers: false };
  }
}

/**
 * Lock the setup by marking setup_complete in app_config.
 */
export async function lockSetup(): Promise<void> {
  const existing = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);

  if (existing.length > 0) {
    await db
      .update(appConfig)
      .set({ setupComplete: 1, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(appConfig.id, 1));
  } else {
    await db.insert(appConfig).values({
      id: 1,
      setupComplete: 1,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  }
}

/**
 * Unlock the setup (admin action).
 */
export async function unlockSetup(): Promise<void> {
  await db
    .update(appConfig)
    .set({ setupComplete: 0, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(appConfig.id, 1));
}