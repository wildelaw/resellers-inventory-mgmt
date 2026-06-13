import { db } from '../lib/db';
import { appConfig } from '../lib/schema';

async function seedSettings() {
  console.log('Seeding default settings...');

  const existing = await db.query.appConfig.findFirst();
  if (!existing) {
    await db.insert(appConfig).values({
      companyName: 'Resale Manager',
      companyTagline: '',
      salesTaxRate: 0.0825,
      setupComplete: 0,
      updatedAt: Math.floor(Date.now() / 1000),
    });
    console.log('Created default settings');
  } else {
    console.log('Settings already exist');
  }

  process.exit(0);
}

seedSettings().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});