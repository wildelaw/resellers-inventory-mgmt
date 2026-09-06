import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import { runMigrations } from '../lib/migrate';

/**
 * Creates (or resets) the admin user. Useful for local development and for
 * recovering admin access after a backup restore.
 *
 * Email/password can be overridden via ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 */
async function seed() {
  runMigrations();

  const email = (process.env.ADMIN_EMAIL || 'security@lawsonsoft.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin123!@#';
  const passwordHash = await bcrypt.hash(password, 10);

  const now = new Date();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    await db.update(users).set({
      passwordHash,
      role: 'admin',
      canViewAll: true,
      isActive: true,
      // passwordChangedAt: 0 keeps existing sessions valid (recovery scenario)
      passwordChangedAt: 0,
      updatedAt: now,
    }).where(eq(users.id, existing.id));
    console.log(`Admin user updated: ${email}`);
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Admin user created: ${email}`);
  }

  // Ensure the app_config row exists and setup is marked complete
  const config = await db.select().from(appConfig).limit(1);
  if (config.length === 0) {
    await db.insert(appConfig).values({
      id: 1,
      companyName: 'Resale Manager',
      companyTagline: '',
      salesTaxRate: 0.0825,
      setupComplete: true,
      updatedAt: now,
    });
  } else if (!config[0].setupComplete) {
    await db.update(appConfig).set({ setupComplete: true, updatedAt: now });
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});