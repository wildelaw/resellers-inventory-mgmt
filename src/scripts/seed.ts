import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');

  // Create default app config
  const existingConfig = await db.query.appConfig.findFirst();
  if (!existingConfig) {
    await db.insert(appConfig).values({
      companyName: 'Resale Manager',
      companyTagline: '',
      salesTaxRate: 0.0825,
      setupComplete: 1,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    console.log('Created default app config');
  }

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminP@ss1';
  const adminName = process.env.ADMIN_NAME || 'Admin User';

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const now = Math.floor(Date.now() / 1000);

    await db.insert(users).values({
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: 'admin',
      canViewAll: 1,
      isActive: 1,
      passwordChangedAt: 0,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Created admin user: ${adminEmail}`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});