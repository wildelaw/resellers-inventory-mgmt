import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  createSaleSchema,
  refundSchema,
  createUserSchema,
  updateUserSchema,
  setupCreateAdminSchema,
  passwordSchema,
} from '@/lib/validations';

describe('Validations', () => {
  describe('createItemSchema', () => {
    it('validates required fields', () => {
      const result = createItemSchema.safeParse({
        name: 'Vintage Jacket',
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = createItemSchema.safeParse({
        name: '',
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        purchaseDate: '2024-01-15',
        purchasePrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional fields as empty string or undefined', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        purchaseDate: '2024-01-15',
        purchasePrice: 10,
        description: undefined,
        category: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createUserSchema', () => {
    it('validates user creation with canViewAll', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
        canViewAll: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects power_user role (only admin and user allowed)', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP@ss1',
        name: 'Test',
        role: 'power_user',
      });
      expect(result.success).toBe(false);
    });

    it('defaults canViewAll to false', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP@ss1',
        name: 'Test',
        role: 'user',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canViewAll).toBe(false);
      }
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid passwords', () => {
      const result = passwordSchema.safeParse('SecureP@ss1');
      expect(result.success).toBe(true);
    });

    it('rejects short passwords', () => {
      const result = passwordSchema.safeParse('Sh1@');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without uppercase', () => {
      const result = passwordSchema.safeParse('securep@ss1');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      const result = passwordSchema.safeParse('SECUREP@SS1');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without digit', () => {
      const result = passwordSchema.safeParse('SecureP@ss');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without special character', () => {
      const result = passwordSchema.safeParse('SecurePass1');
      expect(result.success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('validates refund_no_return', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: 25,
        refundType: 'refund_no_return',
        refundReason: 'Not as described',
      });
      expect(result.success).toBe(true);
    });

    it('validates refund_with_return', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: 25,
        refundType: 'refund_with_return',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid refund type', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: 25,
        refundType: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('allows updating canViewAll', () => {
      const result = updateUserSchema.safeParse({
        canViewAll: true,
      });
      expect(result.success).toBe(true);
    });

    it('allows updating role to admin or user only', () => {
      expect(updateUserSchema.safeParse({ role: 'admin' }).success).toBe(true);
      expect(updateUserSchema.safeParse({ role: 'user' }).success).toBe(true);
      expect(updateUserSchema.safeParse({ role: 'power_user' }).success).toBe(false);
    });
  });
});