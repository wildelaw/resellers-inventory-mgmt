import { sql } from "drizzle-orm";
import { db } from "./db";
import { appConfig, users } from "./schema";

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  setupComplete: boolean;
}

export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const userCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const configRow = await db.query.appConfig.findFirst();

    const hasUsers = (userCount[0]?.count ?? 0) > 0;
    const setupComplete = configRow?.setupComplete ?? false;

    return {
      needsSetup: !hasUsers || !setupComplete,
      hasUsers,
      setupComplete,
    };
  } catch {
    return { needsSetup: true, hasUsers: false, setupComplete: false };
  }
}
