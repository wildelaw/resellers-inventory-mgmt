import { describe, it, expect } from 'vitest';
import {
  passwordSchema,
  createItemSchema,
  updateItemSchema,
  bulkStatusSchema,
  createSaleSchema,
  processRefundSchema,
  createMileageSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  setupAdminSchema,
  updateSettingsSchema,
  importRequestSchema,
} from '@/lib/validations';

const STRONG = 'Str0ng!Pass';

describe('passwordSchema', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse(STRONG).success).toBe(true);
  });
  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('Ab!1x').success).toBe(false);
  });
  it('requires all character classes', () => {
    expect(passwordSchema.safeParse('lowercase!1').success).toBe(false);
    expect(passwordSchema.safeParse('UPPERCASE!1').success).toBe(false);
    expect(passwordSchema.safeParse('NoDigits!here').success).toBe(false);
    expect(passwordSchema.safeParse('NoSpecial123x').success).toBe(false);
  });
  it('rejects passwords over 128 chars', () => {
    expect(passwordSchema.safeParse(`${'Aa1!'.repeat(33)}Aa1!`).success).toBe(false);
  });
});

describe('createItemSchema', () => {
  const valid = {
    name: 'Vintage Lamp',
    purchaseDate: '2026-01-15',
    purchasePrice: '19.99',
  };
  it('accepts a valid item and coerces price strings', () => {
    const r = createItemSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.purchasePrice).toBe(19.99);
      expect(r.data.purchaseDate).toBeInstanceOf(Date);
    }
  });
  it('rejects missing name and price', () => {
    expect(createItemSchema.safeParse({ purchaseDate: '2026-01-15', purchasePrice: 5 }).success).toBe(false);
  });
  it('rejects negative or zero price', () => {
    expect(createItemSchema.safeParse({ ...valid, purchasePrice: -1 }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...valid, purchasePrice: 0 }).success).toBe(false);
  });
  it('rejects invalid dates', () => {
    expect(createItemSchema.safeParse({ ...valid, purchaseDate: 'not-a-date' }).success).toBe(false);
  });
});

describe('updateItemSchema', () => {
  it('accepts partial updates including status', () => {
    expect(updateItemSchema.safeParse({ status: 'listed' }).success).toBe(true);
    expect(updateItemSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });
  it('rejects invalid status values', () => {
    expect(updateItemSchema.safeParse({ status: 'stolen' }).success).toBe(false);
  });
});

describe('bulkStatusSchema', () => {
  it('requires at least one id and a valid status', () => {
    expect(bulkStatusSchema.safeParse({ ids: [1, 2], status: 'donated' }).success).toBe(true);
    expect(bulkStatusSchema.safeParse({ ids: [], status: 'donated' }).success).toBe(false);
    expect(bulkStatusSchema.safeParse({ ids: [1], status: 'nope' }).success).toBe(false);
    expect(bulkStatusSchema.safeParse({ ids: [-1], status: 'donated' }).success).toBe(false);
  });
});

describe('createSaleSchema', () => {
  const valid = { soldDate: '2026-02-01', soldPrice: 50, platform: 'ebay' };
  it('accepts a valid sale with string price coercion', () => {
    const r = createSaleSchema.safeParse({ ...valid, soldPrice: '50.00' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.soldPrice).toBe(50);
  });
  it('rejects invalid platforms', () => {
    expect(createSaleSchema.safeParse({ ...valid, platform: 'craigslist' }).success).toBe(false);
  });
  it('rejects negative fees and missing price', () => {
    expect(createSaleSchema.safeParse({ ...valid, platformFees: -2 }).success).toBe(false);
    expect(createSaleSchema.safeParse({ soldDate: '2026-02-01', platform: 'ebay' }).success).toBe(false);
  });
  it('accepts nullable itemId', () => {
    expect(createSaleSchema.safeParse({ ...valid, itemId: null }).success).toBe(true);
    expect(createSaleSchema.safeParse({ ...valid, itemId: 3 }).success).toBe(true);
  });
});

describe('processRefundSchema', () => {
  it('accepts both refund types with positive amounts', () => {
    expect(processRefundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'refund_no_return' }).success).toBe(true);
    expect(processRefundSchema.safeParse({ saleId: 1, refundAmount: '10', refundType: 'refund_with_return' }).success).toBe(true);
  });
  it('rejects zero/negative refunds and bogus types', () => {
    expect(processRefundSchema.safeParse({ saleId: 1, refundAmount: 0, refundType: 'refund_no_return' }).success).toBe(false);
    expect(processRefundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'none' }).success).toBe(false);
  });
});

describe('createMileageSchema', () => {
  it('accepts a valid trip', () => {
    expect(createMileageSchema.safeParse({ date: '2026-03-01', miles: 12.5 }).success).toBe(true);
  });
  it('rejects zero miles', () => {
    expect(createMileageSchema.safeParse({ date: '2026-03-01', miles: 0 }).success).toBe(false);
  });
});

describe('createUserSchema', () => {
  it('defaults role to user and canViewAll to false', () => {
    const r = createUserSchema.safeParse({ email: 'a@b.com', password: STRONG, name: 'A' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.role).toBe('user');
      expect(r.data.canViewAll).toBe(false);
    }
  });
  it('accepts canViewAll true for view-all users', () => {
    const r = createUserSchema.safeParse({ email: 'a@b.com', password: STRONG, name: 'A', role: 'user', canViewAll: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.canViewAll).toBe(true);
  });
  it('rejects weak passwords and bad emails', () => {
    expect(createUserSchema.safeParse({ email: 'a@b.com', password: 'weak', name: 'A' }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: 'not-an-email', password: STRONG, name: 'A' }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('allows partial updates including canViewAll and isActive', () => {
    expect(updateUserSchema.safeParse({ canViewAll: true }).success).toBe(true);
    expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateUserSchema.safeParse({ role: 'admin' }).success).toBe(true);
  });
  it('rejects invalid role values', () => {
    expect(updateUserSchema.safeParse({ role: 'power_user' }).success).toBe(false);
  });
});

describe('resetPasswordSchema / profileUpdateSchema', () => {
  it('validates reset passwords', () => {
    expect(resetPasswordSchema.safeParse({ newPassword: STRONG }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ newPassword: 'weak' }).success).toBe(false);
  });
  it('discriminates profile vs password updates', () => {
    expect(profileUpdateSchema.safeParse({ type: 'profile', name: 'Chris' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ type: 'password', currentPassword: 'x', newPassword: STRONG }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ type: 'bogus' }).success).toBe(false);
  });
});

describe('setupAdminSchema / updateSettingsSchema', () => {
  it('validates the setup admin payload', () => {
    expect(setupAdminSchema.safeParse({ name: 'Admin', email: 'a@b.com', password: STRONG }).success).toBe(true);
    expect(setupAdminSchema.safeParse({ email: 'a@b.com', password: STRONG }).success).toBe(false);
  });
  it('bounds the sales tax rate to 0..1', () => {
    expect(updateSettingsSchema.safeParse({ sales_tax_rate: 0.0825 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ sales_tax_rate: 1 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ sales_tax_rate: 8.25 }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ sales_tax_rate: -0.1 }).success).toBe(false);
  });
});

describe('importRequestSchema', () => {
  it('accepts the three import types', () => {
    for (const type of ['inventory', 'sales', 'mileage']) {
      expect(importRequestSchema.safeParse({ type, csvData: 'a,b\n1,2' }).success).toBe(true);
    }
  });
  it('rejects unknown types and oversized CSVs', () => {
    expect(importRequestSchema.safeParse({ type: 'photos', csvData: 'a' }).success).toBe(false);
    expect(importRequestSchema.safeParse({ type: 'inventory', csvData: 'x'.repeat(1024 * 1024 + 1) }).success).toBe(false);
  });
  it('accepts optional column mappings', () => {
    expect(importRequestSchema.safeParse({ type: 'inventory', csvData: 'a', columnMappings: { Name: 'name' } }).success).toBe(true);
  });
});