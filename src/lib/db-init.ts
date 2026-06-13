import { db } from './db';
import { appConfig, users } from './schema';
import { eq, sql } from 'drizzle-orm';

export async function getSetupStatus(): Promise<{ needsSetup: boolean; hasUsers: boolean }> {
  try {
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const hasUsers = Number(userCount[0].count) > 0;

    if (!hasUsers) {
      return { needsSetup: true, hasUsers: false };
    }

    const config = await db.select().from(appConfig).where(eq(appConfig.id, 1));
    const setupComplete = config[0]?.setupComplete ?? false;

    return { needsSetup: !setupComplete, hasUsers };
  } catch {
    return { needsSetup: true, hasUsers: false };
  }
}