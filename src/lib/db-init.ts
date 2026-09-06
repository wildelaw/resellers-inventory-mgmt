import { sql } from 'drizzle-orm';
import { db } from './db';
import { users, appConfig } from './schema';
import { DEFAULT_SALES_TAX_RATE } from './constants';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
}

/**
 * Setup status detection. `needsSetup` is true when no users exist (and, once
 * locked, stays false — see app_config.setupComplete).
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const hasUsers = Number(count) > 0;

    // Setup is complete once at least one user exists (setup_complete is set
    // on admin creation, and users can only be created through setup/admin).
    return { needsSetup: !hasUsers, hasUsers };
  } catch {
    // Table may not exist yet (fresh checkout before migrations) — treat as needing setup
    return { needsSetup: true, hasUsers: false };
  }
}

export async function isSetupComplete(): Promise<boolean> {
  try {
    const config = await db.select().from(appConfig).limit(1);
    if (config.length > 0) return config[0].setupComplete === true;
    // No row yet: setup is complete iff users exist
    const status = await getSetupStatus();
    return status.hasUsers;
  } catch {
    return false;
  }
}

/** Returns the single app_config row, creating the default row if absent. */
export async function getAppConfig() {
  const rows = await db.select().from(appConfig).limit(1);
  if (rows.length > 0) return rows[0];

  const inserted = await db
    .insert(appConfig)
    .values({
      id: 1,
      companyName: 'Resale Manager',
      companyTagline: '',
      salesTaxRate: DEFAULT_SALES_TAX_RATE,
      setupComplete: false,
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}