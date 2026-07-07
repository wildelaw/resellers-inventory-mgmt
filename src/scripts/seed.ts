import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import { runMigrations } from '../lib/migrate';
import { nowTimestamp } from '../lib/utils';

async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('AdminP@ss1', 10);
  const now = nowTimestamp();

  // Check if admin already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, 'security@lawsonsoft.com'),
  });

  if (existing) {
    console.log('Admin user already exists, updating password...');
    await db.update(users).set({
      passwordHash,
      passwordChangedAt: 0,
      updatedAt: now,
    }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email: 'security@lawsonsoft.com',
      passwordHash,
      name: 'Admin User',
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Ensure app_config exists
  const existingConfig = await db.query.appConfig.findFirst();
  if (!existingConfig) {
    await db.insert(appConfig).values({
      updatedAt: now,
    });
  }

  // Lock setup
  await db.update(appConfig).set({
    setupComplete: true,
    updatedAt: now,
  }).where(eq(appConfig.id, 1));

  console.log('Seed complete!');
  console.log('Admin email: security@lawsonsoft.com');
  console.log('Admin password: AdminP@ss1');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});