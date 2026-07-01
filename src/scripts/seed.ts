import { db } from '../lib/db';
import { users, appConfig } from '../lib/schema';
import { runMigrations } from '../lib/migrate';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Checking for existing admin...');
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.role, 'admin'),
  });

  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    return;
  }

  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const [admin] = await db.insert(users).values({
    email: 'admin@example.com',
    passwordHash,
    name: 'Admin User',
    role: 'admin',
    canViewAll: true,
    isActive: true,
    passwordChangedAt: new Date(0),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();

  console.log('Admin user created:', admin.email);

  // Ensure app_config exists
  const existingConfig = await db.query.appConfig.findFirst({
    where: eq(appConfig.id, 1),
  });

  if (!existingConfig) {
    console.log('Creating app config...');
    await db.insert(appConfig).values({
      id: 1,
      companyName: 'Resale Manager',
      companyTagline: 'Track your resale business',
      salesTaxRate: 0.0825,
      setupComplete: true,
      updatedAt: new Date(),
    });
    console.log('App config created');
  }

  console.log('\n✅ Seed complete!');
  console.log('Login credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: Admin123!');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
