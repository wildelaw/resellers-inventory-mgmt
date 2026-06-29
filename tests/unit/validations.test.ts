import { describe, it, expect } from 'vitest';
import {
  createItemSchema, updateItemSchema, createSaleSchema, refundSchema,
  createMileageSchema, createUserSchema, updateUserSchema, passwordSchema,
  updateSettingsSchema, importSchema, profileUpdateSchema,
} from '@/lib/validations';

describe('passwordSchema (USR-02)', () => {
  it('accepts a strong password', () => {
    expect(passwordSchema().safeParse('Abcdef1!').success).toBe(true);
  });
  it('rejects too short', () => {
    expect(passwordSchema().safeParse('Ab1!').success).toBe(false);
  });
  it('rejects missing uppercase', () => {
    expect(passwordSchema().safeParse('abcdef1!').success).toBe(false);
  });
  it('rejects missing lowercase', () => {
    expect(passwordSchema().safeParse('ABCDEF1!').success).toBe(false);
  });
  it('rejects missing digit', () => {
    expect(passwordSchema().safeParse('Abcdefg!').success).toBe(false);
  });
  it('rejects missing special char', () => {
    expect(passwordSchema().safeParse('Abcdef12').success).toBe(false);
  });
  it('rejects over 128 chars', () => {
    expect(passwordSchema().safeParse('Aa1!' + 'x'.repeat(130)).success).toBe(false);
  });
});

describe('createItemSchema', () => {
  it('accepts a valid item with string date', () => {
    const r = createItemSchema.safeParse({ name: 'Hat', purchaseDate: '2024-01-15', purchasePrice: '25' });
    expect(r.success).toBe(true);
  });
  it('rejects missing name', () => {
    expect(createItemSchema.safeParse({ purchaseDate: '2024-01-15', purchasePrice: 5 }).success).toBe(false);
  });
  it('rejects negative purchase price', () => {
    expect(createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-15', purchasePrice: -1 }).success).toBe(false);
  });
});

describe('updateItemSchema', () => {
  it('rejects empty update', () => {
    expect(updateItemSchema.safeParse({}).success).toBe(false);
  });
  it('accepts partial update', () => {
    expect(updateItemSchema.safeParse({ name: 'New' }).success).toBe(true);
  });
});

describe('createSaleSchema', () => {
  it('accepts a valid sale', () => {
    expect(createSaleSchema.safeParse({ soldDate: '2024-02-01', soldPrice: '50', platform: 'ebay' }).success).toBe(true);
  });
  it('rejects invalid platform', () => {
    expect(createSaleSchema.safeParse({ soldDate: '2024-02-01', soldPrice: 50, platform: 'walmart' }).success).toBe(false);
  });
  it('rejects negative soldPrice', () => {
    expect(createSaleSchema.safeParse({ soldDate: '2024-02-01', soldPrice: -5, platform: 'ebay' }).success).toBe(false);
  });
});

describe('refundSchema', () => {
  it('accepts refund_with_return', () => {
    expect(refundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'refund_with_return' }).success).toBe(true);
  });
  it('accepts refund_no_return', () => {
    expect(refundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'refund_no_return' }).success).toBe(true);
  });
  it('rejects "none" refundType', () => {
    expect(refundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'none' }).success).toBe(false);
  });
  it('rejects negative refund', () => {
    expect(refundSchema.safeParse({ saleId: 1, refundAmount: -1, refundType: 'refund_no_return' }).success).toBe(false);
  });
});

describe('createMileageSchema', () => {
  it('accepts valid entry', () => {
    expect(createMileageSchema.safeParse({ date: '2024-01-01', miles: '12.5' }).success).toBe(true);
  });
  it('rejects negative miles', () => {
    expect(createMileageSchema.safeParse({ date: '2024-01-01', miles: -1 }).success).toBe(false);
  });
});

describe('createUserSchema (canViewAll)', () => {
  it('defaults canViewAll to false', () => {
    const r = createUserSchema.safeParse({ email: 'a@b.com', password: 'Abcdef1!', name: 'A', role: 'user' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.canViewAll).toBe(false);
  });
  it('accepts admin role', () => {
    expect(createUserSchema.safeParse({ email: 'a@b.com', password: 'Abcdef1!', name: 'A', role: 'admin', canViewAll: true }).success).toBe(true);
  });
  it('rejects power_user role', () => {
    expect(createUserSchema.safeParse({ email: 'a@b.com', password: 'Abcdef1!', name: 'A', role: 'power_user' as never }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts canViewAll toggle', () => {
    expect(updateUserSchema.safeParse({ canViewAll: true }).success).toBe(true);
  });
  it('rejects empty', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });
});

describe('updateSettingsSchema', () => {
  it('rejects tax rate > 1', () => {
    expect(updateSettingsSchema.safeParse({ salesTaxRate: 1.5 }).success).toBe(false);
  });
  it('rejects negative tax rate', () => {
    expect(updateSettingsSchema.safeParse({ salesTaxRate: -0.1 }).success).toBe(false);
  });
  it('accepts 0–1 rate', () => {
    expect(updateSettingsSchema.safeParse({ salesTaxRate: 0.0825 }).success).toBe(true);
  });
});

describe('importSchema', () => {
  it('accepts valid import', () => {
    expect(importSchema.safeParse({ type: 'inventory', csvData: 'name,x\nA,1' }).success).toBe(true);
  });
  it('rejects unknown type', () => {
    expect(importSchema.safeParse({ type: 'other', csvData: 'x' }).success).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('accepts profile name update', () => {
    expect(profileUpdateSchema.safeParse({ type: 'profile', name: 'New' }).success).toBe(true);
  });
  it('rejects password change where new == current', () => {
    expect(profileUpdateSchema.safeParse({ type: 'password', currentPassword: 'Abcdef1!', newPassword: 'Abcdef1!' }).success).toBe(false);
  });
});