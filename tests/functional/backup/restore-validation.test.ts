import { describe, it, expect } from 'vitest';
import { validateBackup } from '@/lib/backup';

const validBackup = {
  version: 2,
  exportedAt: '2026-06-12T10:00:00.000Z',
  tables: {
    users: [{ id: 1, email: 'a@b.com', passwordHash: 'hash', name: 'A', role: 'admin', canViewAll: true, isActive: true, passwordChangedAt: 0, createdAt: 1, updatedAt: 1 }],
    items: [{ id: 1, name: 'Item', purchaseDate: 1, purchasePrice: 10, status: 'available', ownerId: 1, createdAt: 1, updatedAt: 1 }],
    sales: [{ id: 1, soldDate: 1, soldPrice: 20, platform: 'ebay', refundType: 'none', soldBy: 1, createdAt: 1 }],
    photos: [],
    mileage: [],
    app_config: [{ id: 1, companyName: 'Test', companyTagline: '', salesTaxRate: 0.0825, setupComplete: true, updatedAt: 1 }],
  },
};

describe('backup restore validation', () => {
  it('validates a correct backup', () => {
    expect(() => validateBackup(validBackup)).not.toThrow();
  });

  it('rejects invalid role (power_user)', () => {
    const bad = JSON.parse(JSON.stringify(validBackup));
    bad.tables.users[0].role = 'power_user';
    expect(() => validateBackup(bad)).toThrow();
  });

  it('rejects invalid status enum', () => {
    const bad = JSON.parse(JSON.stringify(validBackup));
    bad.tables.items[0].status = 'invalid_status';
    expect(() => validateBackup(bad)).toThrow();
  });

  it('rejects wrong version', () => {
    const bad = JSON.parse(JSON.stringify(validBackup));
    bad.version = 1;
    expect(() => validateBackup(bad)).toThrow();
  });

  it('rejects missing tables key', () => {
    expect(() => validateBackup({ version: 2, exportedAt: 'x' })).toThrow();
  });
});
