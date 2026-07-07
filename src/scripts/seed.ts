import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { users, appConfig } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { runMigrations } from '@/lib/migrate';

async function main() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Seeding admin user...');
  const email = 'security@lawsonsoft.com';
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log('Admin user already exists, updating password...');
    const hash = await bcrypt.hash('AdminP@ss1', 10);
    db.update(users).set({ passwordHash: hash, passwordChangedAt: 0 }).where(eq(users.id, existing.id)).run();
  } else {
    const hash = await bcrypt.hash('AdminP@ss1', 10);
    const now = Math.floor(Date.now() / 1000);
    db.insert(users).values({
      email,
      passwordHash: hash,
      name: 'Admin User',
      role: 'admin',
      canViewAll: true,
      isActive: true,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Ensure app_config row + lock setup.
  const cfg = await db.query.appConfig.findFirst();
  if (!cfg) {
    db.insert(appConfig).values({ id: 1, setupComplete: true }).run();
  } else {
    db.update(appConfig).set({ setupComplete: true }).where(eq(appConfig.id, 1)).run();
  }

  console.log('Seed complete. Admin: security@lawsonsoft.com / AdminP@ss1');
  process.exit(0);
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
