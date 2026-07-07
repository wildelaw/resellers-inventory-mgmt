import { describe, it, expect } from 'vitest';
import {
  createItemSchema, updateItemSchema, createSaleSchema, refundSchema,
  createUserSchema, updateUserSchema, passwordSchema, setupSchema,
  createMileageSchema, bulkStatusSchema, updateSettingsSchema,
} from '@/lib/validations';

describe('validations', () => {
  describe('passwordSchema', () => {
    it('accepts valid password', () => { expect(passwordSchema.safeParse('SecureP@ss1').success).toBe(true); });
    it('rejects too short', () => { expect(passwordSchema.safeParse('Aa1!').success).toBe(false); });
    it('rejects no uppercase', () => { expect(passwordSchema.safeParse('securep@ss1').success).toBe(false); });
    it('rejects no lowercase', () => { expect(passwordSchema.safeParse('SECUREP@SS1').success).toBe(false); });
    it('rejects no digit', () => { expect(passwordSchema.safeParse('SecureP@ss').success).toBe(false); });
    it('rejects no special', () => { expect(passwordSchema.safeParse('SecurePass1').success).toBe(false); });
  });

  describe('createItemSchema', () => {
    it('accepts valid item', () => {
      expect(createItemSchema.safeParse({ name: 'Jacket', purchaseDate: '2024-01-15', purchasePrice: '25.00' }).success).toBe(true);
    });
    it('rejects missing name', () => {
      expect(createItemSchema.safeParse({ purchaseDate: '2024-01-15', purchasePrice: 25 }).success).toBe(false);
    });
    it('rejects name too long', () => {
      expect(createItemSchema.safeParse({ name: 'a'.repeat(201), purchaseDate: '2024-01-15', purchasePrice: 25 }).success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('includes canViewAll field with default false', () => {
      const result = createUserSchema.safeParse({ email: 'a@b.com', password: 'SecureP@ss1', name: 'Test' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.canViewAll).toBe(false);
    });
    it('accepts canViewAll true', () => {
      expect(createUserSchema.safeParse({ email: 'a@b.com', password: 'SecureP@ss1', name: 'Test', canViewAll: true }).success).toBe(true);
    });
    it('rejects power_user role', () => {
      expect(createUserSchema.safeParse({ email: 'a@b.com', password: 'SecureP@ss1', name: 'Test', role: 'power_user' }).success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts canViewAll update', () => {
      expect(updateUserSchema.safeParse({ canViewAll: true }).success).toBe(true);
    });
  });

  describe('refundSchema', () => {
    it('accepts valid refund', () => {
      expect(refundSchema.safeParse({ saleId: 1, refundAmount: '25.00', refundType: 'refund_with_return' }).success).toBe(true);
    });
    it('rejects invalid refund type', () => {
      expect(refundSchema.safeParse({ saleId: 1, refundAmount: 25, refundType: 'invalid' }).success).toBe(false);
    });
  });

  describe('bulkStatusSchema', () => {
    it('requires at least one id', () => {
      expect(bulkStatusSchema.safeParse({ ids: [], status: 'donated' }).success).toBe(false);
    });
    it('accepts valid bulk update', () => {
      expect(bulkStatusSchema.safeParse({ ids: [1, 2, 3], status: 'sold' }).success).toBe(true);
    });
  });

  describe('updateSettingsSchema', () => {
    it('accepts valid tax rate', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: '0.0825' }).success).toBe(true);
    });
    it('rejects tax rate > 1', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: 1.5 }).success).toBe(false);
    });
    it('rejects negative tax rate', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: -0.1 }).success).toBe(false);
    });
  });
});
