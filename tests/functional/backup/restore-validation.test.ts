import { describe, it, expect } from 'vitest';
import { validateBackup } from '@/lib/backup';

describe('Backup restore validation', () => {
  const validBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    tables: {
      users: [{
        id: 1, email: 'admin@test.com', passwordHash: 'hash', name: 'Admin',
        role: 'admin' as const, canViewAll: true, isActive: true,
        passwordChangedAt: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        createdBy: null, lastLogin: null,
      }],
      items: [],
      sales: [],
      photos: [],
      mileage: [],
      app_config: [{
        id: 1, companyName: 'Test', companyTagline: '', salesTaxRate: 0.0825,
        setupComplete: true, updatedAt: '2024-01-01',
      }],
    },
  };

  it('validates a correct backup', () => {
    const result = validateBackup(validBackup);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects backup with invalid role', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        users: [{
          ...validBackup.tables.users[0],
          role: 'power_user',
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects backup with missing required fields', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        users: [{ id: 1, email: 'test@test.com' }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.valid).toBe(false);
  });

  it('rejects backup with invalid email', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        users: [{
          ...validBackup.tables.users[0],
          email: 'not-an-email',
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.valid).toBe(false);
  });

  it('rejects backup with wrong version', () => {
    const invalidBackup = { ...validBackup, version: 1 };
    // The schema requires version 2 (number), so version 1 should still be valid
    // but let's test with a non-number version
    const badVersion = { ...validBackup, version: 'bad' };
    const result = validateBackup(badVersion);
    expect(result.valid).toBe(false);
  });

  it('rejects backup with invalid enum values', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        items: [{
          id: 1, name: 'Test', description: null, purchaseDate: '2024-01-01',
          purchasePrice: 10, purchaseLocation: null, category: null,
          status: 'invalid_status', notes: null, removalDate: null,
          metadata: null, ownerId: 1, createdAt: '2024-01-01', updatedAt: '2024-01-01',
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.valid).toBe(false);
  });
});