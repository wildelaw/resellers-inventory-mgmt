import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  setupSchema,
  passwordSchema,
  refundSaleSchema,
  createSaleSchema,
  updateSettingsSchema,
  bulkStatusUpdateSchema,
  importSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('passwordSchema', () => {
    it('accepts valid passwords', () => {
      const result = passwordSchema.safeParse('SecureP@ss1');
      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Sh1@');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without uppercase', () => {
      const result = passwordSchema.safeParse('lowercase1@');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without lowercase', () => {
      const result = passwordSchema.safeParse('UPPERCASE1@');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without digit', () => {
      const result = passwordSchema.safeParse('NoDigit!@#');
      expect(result.success).toBe(false);
    });

    it('rejects passwords without special character', () => {
      const result = passwordSchema.safeParse('NoSpecial1A');
      expect(result.success).toBe(false);
    });

    it('rejects passwords over 128 characters', () => {
      const longPassword = 'A'.repeat(126) + '1@b';
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('createItemSchema', () => {
    it('accepts valid item data', () => {
      const result = createItemSchema.safeParse({
        name: 'Vintage Jacket',
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 25.00,
      });
      expect(result.success).toBe(true);
    });

    it('requires name', () => {
      const result = createItemSchema.safeParse({
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 25.00,
      });
      expect(result.success).toBe(false);
    });

    it('requires positive purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 10,
        description: 'A nice item',
        category: 'Clothing',
        purchaseLocation: 'Goodwill',
        notes: 'Great find',
      });
      expect(result.success).toBe(true);
    });

    it('rejects name over 200 chars', () => {
      const result = createItemSchema.safeParse({
        name: 'A'.repeat(201),
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('accepts valid user with canViewAll', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
        canViewAll: true,
      });
      expect(result.success).toBe(true);
    });

    it('accepts user without canViewAll (defaults to false)', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = createUserSchema.safeParse({
        email: 'user@test.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'power_user',
      });
      expect(result.success).toBe(false);
    });

    it('accepts admin role', () => {
      const result = createUserSchema.safeParse({
        email: 'admin@test.com',
        password: 'SecureP@ss1',
        name: 'Admin',
        role: 'admin',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts partial updates', () => {
      const result = updateUserSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('accepts canViewAll update', () => {
      const result = updateUserSchema.safeParse({ canViewAll: true });
      expect(result.success).toBe(true);
    });
  });

  describe('refundSaleSchema', () => {
    it('accepts valid refund_with_return', () => {
      const result = refundSaleSchema.safeParse({
        saleId: 1,
        refundAmount: 25.00,
        refundType: 'refund_with_return',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid refund_no_return', () => {
      const result = refundSaleSchema.safeParse({
        saleId: 1,
        refundAmount: 25.00,
        refundType: 'refund_no_return',
      });
      expect(result.success).toBe(true);
    });

    it('requires saleId', () => {
      const result = refundSaleSchema.safeParse({
        refundAmount: 25.00,
        refundType: 'refund_with_return',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('accepts valid settings', () => {
      const result = updateSettingsSchema.safeParse({
        company_name: 'My Store',
        sales_tax_rate: 0.0825,
      });
      expect(result.success).toBe(true);
    });

    it('rejects tax rate over 1', () => {
      const result = updateSettingsSchema.safeParse({
        sales_tax_rate: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative tax rate', () => {
      const result = updateSettingsSchema.safeParse({
        sales_tax_rate: -0.1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bulkStatusUpdateSchema', () => {
    it('accepts valid bulk update', () => {
      const result = bulkStatusUpdateSchema.safeParse({
        ids: [1, 2, 3],
        status: 'donated',
      });
      expect(result.success).toBe(true);
    });

    it('requires non-empty ids array', () => {
      const result = bulkStatusUpdateSchema.safeParse({
        ids: [],
        status: 'donated',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('importSchema', () => {
    it('accepts valid import data', () => {
      const result = importSchema.safeParse({
        type: 'inventory',
        csvData: 'name,price\nJacket,25',
      });
      expect(result.success).toBe(true);
    });

    it('rejects CSV data over 1MB', () => {
      const result = importSchema.safeParse({
        type: 'inventory',
        csvData: 'A'.repeat(1048577),
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid type', () => {
      const result = importSchema.safeParse({
        type: 'invalid',
        csvData: 'data',
      });
      expect(result.success).toBe(false);
    });
  });
});