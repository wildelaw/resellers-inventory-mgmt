/**
 * Seed script — creates the initial admin user.
 * Usage: npx tsx src/scripts/seed.ts [email] [password]
 */
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users, appConfig, fromBool, nowTs } from '../lib/schema';
import { runMigrationsSync } from '../lib/migrate';

async function main() {
  runMigrationsSync();

  const email = (process.argv[2] || 'admin@example.com').trim().toLowerCase();
  const password = process.argv[3] || 'AdminP@ss1';

  const existing = db.select().from(users).where(eq(users.email, email)).all();
  if (existing.length > 0) {
    console.log(`[seed] User ${email} already exists (id=${existing[0].id}). Nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10); // SEC-02: cost factor 10
  const ts = nowTs();
  const [user] = db.insert(users).values({
    email,
    passwordHash,
    name: 'Admin User',
    role: 'admin',
    canViewAll: fromBool(true),
    isActive: 1,
    passwordChangedAt: 0, // seed admin: no prior sessions to invalidate
    createdAt: ts,
    updatedAt: ts,
  }).returning().all();

  // Ensure app_config single row exists + setup locked.
  const cfg = db.select().from(appConfig).where(eq(appConfig.id, 1)).all();
  if (cfg.length === 0) {
    db.insert(appConfig).values({ id: 1, setupComplete: 1, updatedAt: ts }).run();
  } else {
    db.update(appConfig).set({ setupComplete: 1, updatedAt: ts }).where(eq(appConfig.id, 1)).run();
  }

  console.log(`[seed] Created admin user: id=${user.id} email=${user.email} (login with the provided password).`);
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});