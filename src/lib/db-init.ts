import { db } from './db';
import { appConfig, users } from './schema';
import { eq } from 'drizzle-orm';

export interface SetupStatus {
  needsSetup: boolean;
  hasUsers: boolean;
  setupComplete: boolean;
}

/**
 * Get the current setup status of the application
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    // Check if any users exist
    const userCount = await db.select({ count: users.id })
      .from(users)
      .then(rows => rows.length);
    
    const hasUsers = userCount > 0;

    // Check if setup is complete
    const config = await db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });

    const setupComplete = config?.setupComplete ?? false;

    // Setup is needed if there are no users OR setup is not marked complete
    const needsSetup = !hasUsers || !setupComplete;

    return {
      needsSetup,
      hasUsers,
      setupComplete,
    };
  } catch (error) {
    console.error('Error checking setup status:', error);
    // If there's an error (e.g., tables don't exist), setup is needed
    return {
      needsSetup: true,
      hasUsers: false,
      setupComplete: false,
    };
  }
}

/**
 * Mark setup as complete
 */
export async function markSetupComplete(): Promise<void> {
  try {
    // Check if config row exists
    const existing = await db.query.appConfig.findFirst({
      where: eq(appConfig.id, 1),
    });

    if (existing) {
      await db
        .update(appConfig)
        .set({ setupComplete: true, updatedAt: new Date() })
        .where(eq(appConfig.id, 1));
    } else {
      await db.insert(appConfig).values({
        id: 1,
        setupComplete: true,
        companyName: 'Resale Manager',
        companyTagline: '',
        salesTaxRate: 0.0825,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error marking setup complete:', error);
    throw error;
  }
}

/**
 * Unlock setup (admin only operation)
 */
export async function unlockSetup(): Promise<void> {
  try {
    await db
      .update(appConfig)
      .set({ setupComplete: false, updatedAt: new Date() })
      .where(eq(appConfig.id, 1));
  } catch (error) {
    console.error('Error unlocking setup:', error);
    throw error;
  }
}
