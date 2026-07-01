import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, appConfig } from './schema';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const allUsers = await db.select().from(users).limit(1);
    const hasUsers = allUsers.length > 0;

    let setupComplete = false;
    const configRow = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
    if (configRow.length > 0) {
      setupComplete = configRow[0].setupComplete === 1;
    }

    return {
      needsSetup: !hasUsers && !setupComplete,
      hasUsers,
    };
  } catch {
    // Database not initialized yet — needs setup
    return { needsSetup: true, hasUsers: false };
  }
}

export async function isSetupComplete(): Promise<boolean> {
  const status = await getSetupStatus();
  return !status.needsSetup;
}

export async function ensureAppConfigRow(): Promise<void> {
  const { nowTimestamp } = await import('./utils');
  const existing = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (existing.length === 0) {
    await db.insert(appConfig).values({
      id: 1,
      setupComplete: 0,
      updatedAt: nowTimestamp(),
    });
  }
}