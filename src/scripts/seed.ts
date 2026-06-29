import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import { eq } from 'drizzle-orm';
import { runMigrations } from '../lib/migrate';
import { ensureAppConfigRow, markSetupComplete } from '../lib/db-init';

async function main() {
  // Run migrations first
  runMigrations();
  await ensureAppConfigRow();

  const email = (process.env.SEED_EMAIL ?? 'admin@localhost').trim().toLowerCase();
  const password = process.env.SEED_PASSWORD ?? 'AdminP@ss1';
  const name = process.env.SEED_NAME ?? 'Admin User';

  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    console.log(`User ${email} already exists (id=${existing.id}). Updating password.`);
    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();
    db.update(users)
      .set({ passwordHash: hash, name, updatedAt: now, passwordChangedAt: 0 })
      .where(eq(users.id, existing.id))
      .run();
  } else {
    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();
    const created = db
      .insert(users)
      .values({
        email,
        passwordHash: hash,
        name,
        role: 'admin',
        canViewAll: true,
        isActive: true,
        passwordChangedAt: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: null,
      })
      .returning()
      .get();
    console.log(`Created admin user ${email} (id=${created.id}).`);
  }

  await markSetupComplete();
  console.log('Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});