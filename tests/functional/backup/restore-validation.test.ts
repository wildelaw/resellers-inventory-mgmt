import { describe, it, expect } from 'vitest';
import { backupSchema } from '@/lib/backup';

describe('backup restore validation', () => {
  const validBackup = {
    version: 2,
    exportedAt: '2026-06-12T10:30:00.000Z',
    tables: {
      users: [{
        id: 1,
        email: 'admin@example.com',
        password_hash: '$2b$10$hash',
        name: 'Admin',
        role: 'admin',
        can_view_all: 1,
        is_active: 1,
        password_changed_at: 0,
        created_at: 1718000000,
        updated_at: 1718000000,
      }],
      items: [{
        id: 1,
        name: 'Test Item',
        description: null,
        purchase_date: 1718000000,
        purchase_price: 25.00,
        purchase_location: null,
        category: null,
        status: 'available',
        notes: null,
        removal_date: null,
        metadata: null,
        owner_id: 1,
        created_at: 1718000000,
        updated_at: 1718000000,
      }],
      sales: [{
        id: 1,
        item_id: 1,
        sold_date: 1718000000,
        sold_price: 50.00,
        shipping_cost: null,
        shipping_collected: 0,
        platform: 'ebay',
        sales_tax: null,
        platform_fees: 0,
        refund_amount: 0,
        refund_reason: null,
        refund_type: 'none',
        sold_by: 1,
        created_at: 1718000000,
      }],
      photos: [],
      mileage: [],
      app_config: [{
        id: 1,
        company_name: 'Resale Manager',
        company_tagline: '',
        sales_tax_rate: 0.0825,
        setup_complete: 1,
        updated_at: 1718000000,
      }],
    },
  };

  it('validates a valid backup', () => {
    const result = backupSchema.safeParse(validBackup);
    expect(result.success).toBe(true);
  });

  it('rejects invalid role', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.users[0].role = 'power_user';
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.items[0].status = 'invalid_status';
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid platform', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.sales[0].platform = 'amazon';
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid refund type', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.sales[0].refund_type = 'invalid';
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects sales tax rate outside 0-1 range', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.app_config[0].sales_tax_rate = 1.5;
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing tables', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    delete invalid.tables.mileage;
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative purchase price', () => {
    const invalid = JSON.parse(JSON.stringify(validBackup));
    invalid.tables.items[0].purchase_price = -5;
    const result = backupSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});