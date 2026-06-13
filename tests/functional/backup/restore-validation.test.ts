import { describe, it, expect } from 'vitest';
import { validateBackup } from '@/lib/backup';

describe('Backup Validation', () => {
  const validBackup = {
    version: 2,
    exportedAt: '2026-06-12T10:30:00.000Z',
    tables: {
      users: [],
      items: [],
      sales: [],
      photos: [],
      mileage: [],
      app_config: [{
        id: 1,
        company_name: 'Resale Manager',
        company_tagline: '',
        sales_tax_rate: 0.0825,
        setup_complete: 1,
        updated_at: 1718179200,
      }],
    },
  };

  it('validates a correct backup structure', () => {
    const result = validateBackup(validBackup);
    expect(result.success).toBe(true);
  });

  it('rejects backup with invalid role', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        users: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hash',
          name: 'Test',
          role: 'power_user', // Invalid - should be admin or user
          can_view_all: 0,
          is_active: 1,
          password_changed_at: 0,
          created_at: 1718179200,
          updated_at: 1718179200,
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.success).toBe(false);
  });

  it('rejects backup with missing version', () => {
    const { version: _, ...backupWithoutVersion } = validBackup as any;
    const result = validateBackup(backupWithoutVersion);
    expect(result.success).toBe(false);
  });

  it('rejects backup with invalid item status', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        items: [{
          id: 1,
          name: 'Item',
          purchase_date: 1718179200,
          purchase_price: 25,
          status: 'invalid_status',
          owner_id: 1,
          created_at: 1718179200,
          updated_at: 1718179200,
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.success).toBe(false);
  });

  it('rejects backup with sales_tax_rate out of range', () => {
    const invalidBackup = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        app_config: [{
          id: 1,
          company_name: 'Resale Manager',
          company_tagline: '',
          sales_tax_rate: 1.5, // Invalid - must be 0-1
          setup_complete: 1,
          updated_at: 1718179200,
        }],
      },
    };
    const result = validateBackup(invalidBackup);
    expect(result.success).toBe(false);
  });
});