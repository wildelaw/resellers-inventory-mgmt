import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import { runMigrations } from '../lib/migrate';
import { eq } from 'drizzle-orm';
import { nowTimestamp } from '../lib/utils';

async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Ensuring app_config row...');
  const existingConfig = await db.select().from(appConfig).where(eq(appConfig.id, 1)).limit(1);
  if (existingConfig.length === 0) {
    await db.insert(appConfig).values({
      id: 1,
      setupComplete: 1,
      updatedAt: nowTimestamp(),
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminP@ss1';

  const existing = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (existing) {
    console.log(`Admin user already exists: ${adminEmail}`);
    process.exit(0);
  }

  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const now = nowTimestamp();

  await db.insert(users).values({
    email: adminEmail,
    passwordHash,
    name: 'Admin',
    role: 'admin',
    canViewAll: 1,
    isActive: 1,
    passwordChangedAt: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Admin user created: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});