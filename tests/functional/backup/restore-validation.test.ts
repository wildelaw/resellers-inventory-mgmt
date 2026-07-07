import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, cleanupTestDb } from '../../setup/db';
import { users, appConfig } from '../../../src/lib/schema';
import { validateBackup } from '../../../src/lib/backup';
import { nowTimestamp } from '../../../src/lib/utils';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../../src/lib/schema';

let db: BetterSQLite3Database<typeof schema>;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  cleanupTestDb(db);
});

describe('Backup Restore Validation', () => {
  it('validates a correct backup', () => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [{
          id: 1,
          email: 'admin@example.com',
          password_hash: 'hash',
          name: 'Admin',
          role: 'admin',
          can_view_all: 1,
          is_active: 1,
          password_changed_at: 0,
          created_at: nowTimestamp(),
          updated_at: nowTimestamp(),
        }],
        items: [],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [{
          id: 1,
          company_name: 'Test',
          company_tagline: '',
          sales_tax_rate: 0.0825,
          setup_complete: 1,
          updated_at: nowTimestamp(),
        }],
      },
    };

    const result = validateBackup(backup);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid role', () => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [{
          id: 1,
          email: 'admin@example.com',
          password_hash: 'hash',
          name: 'Admin',
          role: 'power_user', // Invalid in v2
          can_view_all: 0,
          is_active: 1,
          password_changed_at: 0,
          created_at: nowTimestamp(),
          updated_at: nowTimestamp(),
        }],
        items: [],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [],
      },
    };

    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid item status', () => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [],
        items: [{
          id: 1,
          name: 'Test',
          description: null,
          purchase_date: nowTimestamp(),
          purchase_price: 10,
          purchase_location: null,
          category: null,
          status: 'invalid_status',
          notes: null,
          removal_date: null,
          metadata: null,
          owner_id: 1,
          created_at: nowTimestamp(),
          updated_at: nowTimestamp(),
        }],
        sales: [],
        photos: [],
        mileage: [],
        app_config: [],
      },
    };

    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
  });

  it('rejects missing tables', () => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: [],
        items: [],
        // Missing: sales, photos, mileage, app_config
      },
    };

    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
  });

  it('rejects missing version field', () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      tables: {
        users: [], items: [], sales: [], photos: [], mileage: [], app_config: [],
      },
    };

    const result = validateBackup(backup);
    expect(result.valid).toBe(false);
  });
});