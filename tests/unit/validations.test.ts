import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  createSaleSchema,
  refundSchema,
  createMileageSchema,
  createUserSchema,
  updateUserSchema,
  setupSchema,
  updateSettingsSchema,
} from '@/lib/validations';

describe('validations', () => {
  describe('createItemSchema', () => {
    it('validates a valid item', () => {
      const result = createItemSchema.safeParse({
        name: 'Test Item',
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
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
        purchasePrice: '-5',
      });
      expect(result.success).toBe(false);
    });

    it('converts string price to number', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.purchasePrice).toBe(25);
        expect(typeof result.data.purchasePrice).toBe('number');
      }
    });
  });

  describe('createSaleSchema', () => {
    it('validates a valid sale', () => {
      const result = createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: '100',
        platform: 'ebay',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid platform', () => {
      const result = createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: '100',
        platform: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative sold price', () => {
      const result = createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: '-10',
        platform: 'ebay',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('validates a refund with return', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: '25.00',
        refundType: 'refund_with_return',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative refund amount', () => {
      const result = refundSchema.safeParse({
        saleId: 1,
        refundAmount: '-5',
        refundType: 'refund_no_return',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('validates a valid user with canViewAll', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'user',
        canViewAll: true,
      });
      expect(result.success).toBe(true);
    });

    it('defaults canViewAll to false', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canViewAll).toBe(false);
      }
    });

    it('rejects weak password', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'SecureP@ss1',
        name: 'Test User',
        role: 'power_user',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('setupSchema', () => {
    it('validates valid setup data', () => {
      const result = setupSchema.safeParse({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'SecureP@ss1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = setupSchema.safeParse({
        name: 'Admin',
        email: 'not-an-email',
        password: 'SecureP@ss1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('validates tax rate between 0 and 1', () => {
      const valid = updateSettingsSchema.safeParse({ salesTaxRate: 0.0825 });
      expect(valid.success).toBe(true);

      const invalid = updateSettingsSchema.safeParse({ salesTaxRate: 1.5 });
      expect(invalid.success).toBe(false);
    });
  });

  describe('createMileageSchema', () => {
    it('validates valid mileage entry', () => {
      const result = createMileageSchema.safeParse({
        date: '2024-01-15',
        miles: '25.5',
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative miles', () => {
      const result = createMileageSchema.safeParse({
        date: '2024-01-15',
        miles: '-5',
      });
      expect(result.success).toBe(false);
    });
  });
});