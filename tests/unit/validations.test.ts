import { describe, it, expect } from 'vitest';
import { createItemSchema, updateItemSchema, createUserSchema, updateUserSchema, loginSchema, setupSchema, passwordSchema, createSaleSchema, refundSchema, settingsSchema, createMileageSchema, updateMileageSchema } from '@/lib/validations';

describe('Validations', () => {
  describe('createItemSchema', () => {
    it('validates a valid item', () => {
      const result = createItemSchema.safeParse({
        name: 'Vintage Jacket',
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects item without name', () => {
      const result = createItemSchema.safeParse({
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '-10.00',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('validates user with canViewAll', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
        canViewAll: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects power_user role', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'power_user',
      });
      expect(result.success).toBe(false);
    });

    it('defaults canViewAll to false', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.canViewAll).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts strong passwords', () => {
      expect(passwordSchema.safeParse('SecureP@ss1').success).toBe(true);
    });

    it('rejects passwords under 8 characters', () => {
      expect(passwordSchema.safeParse('P@ss1').success).toBe(false);
    });

    it('rejects passwords over 128 characters', () => {
      expect(passwordSchema.safeParse('A'.repeat(129) + '1a!').success).toBe(false);
    });

    it('rejects passwords without uppercase', () => {
      expect(passwordSchema.safeParse('password1!').success).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      expect(passwordSchema.safeParse('PASSWORD1!').success).toBe(false);
    });

    it('rejects passwords without digit', () => {
      expect(passwordSchema.safeParse('Password!!').success).toBe(false);
    });

    it('rejects passwords without special character', () => {
      expect(passwordSchema.safeParse('Password12').success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('allows canViewAll update', () => {
      const result = updateUserSchema.safeParse({ canViewAll: true });
      expect(result.success).toBe(true);
    });

    it('rejects power_user role', () => {
      const result = updateUserSchema.safeParse({ role: 'power_user' });
      expect(result.success).toBe(false);
    });
  });

  describe('settingsSchema', () => {
    it('validates tax rate between 0 and 1', () => {
      expect(settingsSchema.safeParse({ salesTaxRate: 0.0825 }).success).toBe(true);
      expect(settingsSchema.safeParse({ salesTaxRate: 1.5 }).success).toBe(false);
      expect(settingsSchema.safeParse({ salesTaxRate: -0.1 }).success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('validates refund_with_return', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: '25.00',
        refundType: 'refund_with_return',
      });
      expect(result.success).toBe(true);
    });

    it('validates refund_no_return', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: '10.00',
        refundType: 'refund_no_return',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative refund amount', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: '-5.00',
        refundType: 'refund_no_return',
      });
      expect(result.success).toBe(false);
    });
  });
});