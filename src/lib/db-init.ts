import { db } from './db';
import { appConfig, users } from './schema';
import { eq } from 'drizzle-orm';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const configRow = await db.query.appConfig.findFirst();
    if (configRow?.setupComplete) {
      return { needsSetup: false, hasUsers: true };
    }

    const userCount = await db.select({ id: users.id }).from(users).limit(1);
    return {
      needsSetup: userCount.length === 0,
      hasUsers: userCount.length > 0,
    };
  } catch {
    // Database might not exist yet during initial setup
    return { needsSetup: true, hasUsers: false };
  }
}

export async function lockSetup(): Promise<void> {
  await db.update(appConfig)
    .set({ setupComplete: 1, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(appConfig.id, 1));
}

export async function unlockSetup(): Promise<void> {
  await db.update(appConfig)
    .set({ setupComplete: 0, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(appConfig.id, 1));
}