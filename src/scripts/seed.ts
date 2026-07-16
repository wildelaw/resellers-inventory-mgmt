import "dotenv/config";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users, appConfig } from "../lib/schema";
import { runMigrations } from "../lib/migrate";

async function seed() {
  runMigrations();

  const email = process.env.SEED_EMAIL || "admin@example.com";
  const password = process.env.SEED_PASSWORD || "AdminP@ss123";
  const name = process.env.SEED_NAME || "Admin User";

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    console.log(`User ${email} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = Math.floor(Date.now() / 1000);

  await db.insert(users).values({
    email,
    name,
    passwordHash,
    role: "admin",
    canViewAll: true,
    isActive: true,
    passwordChangedAt: 0,
    createdAt: now,
    updatedAt: now,
  });

  const cfg = await db.query.appConfig.findFirst();
  if (!cfg) {
    await db.insert(appConfig).values({
      id: 1,
      companyName: "Resale Manager",
      companyTagline: "",
      salesTaxRate: 0.0825,
      setupComplete: true,
      updatedAt: now,
    });
  } else if (!cfg.setupComplete) {
    await db
      .update(appConfig)
      .set({ setupComplete: true, updatedAt: now })
      .where(eq(appConfig.id, cfg.id));
  }

  console.log(`Seeded admin user: ${email} / ${password}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
