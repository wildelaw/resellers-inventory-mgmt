import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  createSaleSchema,
  refundSchema,
  createMileageSchema,
  createUserSchema,
  updateUserSchema,
  passwordSchema,
  setupSchema,
  updateSettingsSchema,
} from '../../src/lib/validations';

describe('Validations', () => {
  describe('passwordSchema', () => {
    it('validates a strong password', () => {
      expect(passwordSchema.safeParse('StrongP@ss1').success).toBe(true);
    });

    it('rejects short passwords', () => {
      expect(passwordSchema.safeParse('Ab1!').success).toBe(false);
    });

    it('rejects missing uppercase', () => {
      expect(passwordSchema.safeParse('weakp@ss1').success).toBe(false);
    });

    it('rejects missing lowercase', () => {
      expect(passwordSchema.safeParse('WEAKP@SS1').success).toBe(false);
    });

    it('rejects missing digit', () => {
      expect(passwordSchema.safeParse('WeakPass!').success).toBe(false);
    });

    it('rejects missing special character', () => {
      expect(passwordSchema.safeParse('WeakPass1').success).toBe(false);
    });

    it('rejects passwords over 128 chars', () => {
      const long = 'A' + 'a1!'.repeat(50);
      expect(passwordSchema.safeParse(long).success).toBe(false);
    });
  });

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
      expect(createItemSchema.safeParse({ purchaseDate: '2024-01-15', purchasePrice: 25 }).success).toBe(false);
    });

    it('rejects name over 200 chars', () => {
      expect(createItemSchema.safeParse({
        name: 'A'.repeat(201),
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
      }).success).toBe(false);
    });

    it('rejects negative purchase price', () => {
      expect(createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: -5,
      }).success).toBe(false);
    });
  });

  describe('createSaleSchema', () => {
    it('validates a valid sale', () => {
      expect(createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: '50.00',
        platform: 'ebay',
      }).success).toBe(true);
    });

    it('rejects invalid platform', () => {
      expect(createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: 50,
        platform: 'invalid',
      }).success).toBe(false);
    });
  });

  describe('refundSchema', () => {
    it('validates a valid refund', () => {
      expect(refundSchema.safeParse({
        saleId: 1,
        refundAmount: '25.00',
        refundType: 'refund_with_return',
      }).success).toBe(true);
    });

    it('rejects negative refund amount', () => {
      expect(refundSchema.safeParse({
        saleId: 1,
        refundAmount: -5,
        refundType: 'refund_no_return',
      }).success).toBe(false);
    });

    it('rejects invalid refund type', () => {
      expect(refundSchema.safeParse({
        saleId: 1,
        refundAmount: 25,
        refundType: 'invalid',
      }).success).toBe(false);
    });
  });

  describe('createMileageSchema', () => {
    it('validates a valid mileage entry', () => {
      expect(createMileageSchema.safeParse({
        date: '2024-01-15',
        miles: '25.5',
      }).success).toBe(true);
    });

    it('rejects negative miles', () => {
      expect(createMileageSchema.safeParse({
        date: '2024-01-15',
        miles: -5,
      }).success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('validates a valid user with canViewAll', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'StrongP@ss1',
        name: 'Test User',
        role: 'user',
        canViewAll: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canViewAll).toBe(true);
      }
    });

    it('defaults canViewAll to false', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'StrongP@ss1',
        name: 'Test User',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canViewAll).toBe(false);
      }
    });

    it('rejects invalid role', () => {
      expect(createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'StrongP@ss1',
        name: 'Test',
        role: 'power_user',
      }).success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('allows partial updates with canViewAll', () => {
      expect(updateUserSchema.safeParse({ canViewAll: true }).success).toBe(true);
    });
  });

  describe('setupSchema', () => {
    it('validates setup data', () => {
      expect(setupSchema.safeParse({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'StrongP@ss1',
      }).success).toBe(true);
    });

    it('rejects weak password', () => {
      expect(setupSchema.safeParse({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'weak',
      }).success).toBe(false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('validates tax rate between 0 and 1', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: 0.0825 }).success).toBe(true);
    });

    it('rejects tax rate over 1', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: 1.5 }).success).toBe(false);
    });

    it('rejects negative tax rate', () => {
      expect(updateSettingsSchema.safeParse({ salesTaxRate: -0.1 }).success).toBe(false);
    });
  });
});