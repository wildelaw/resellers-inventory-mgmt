import { describe, it, expect } from 'vitest';
import {
  userRoleSchema,
  setupSchema,
  createUserSchema,
  updateUserSchema,
  createItemSchema,
  updateItemSchema,
  createSaleSchema,
  refundSchema,
  createMileageSchema,
  importSchema,
  changePasswordSchema,
} from '@/lib/validations';

describe('validations', () => {
  describe('userRoleSchema', () => {
    it('accepts admin and user only', () => {
      expect(userRoleSchema.safeParse('admin').success).toBe(true);
      expect(userRoleSchema.safeParse('user').success).toBe(true);
      expect(userRoleSchema.safeParse('power_user').success).toBe(false);
      expect(userRoleSchema.safeParse('superadmin').success).toBe(false);
    });
  });

  describe('setupSchema', () => {
    it('requires valid email and strong password', () => {
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'Abcdefg1!' }).success).toBe(true);
      expect(setupSchema.safeParse({ name: 'A', email: 'bad', password: 'Abcdefg1!' }).success).toBe(false);
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'short' }).success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('defaults role to user and canViewAll to false', () => {
      const r = createUserSchema.safeParse({
        email: 'a@b.com',
        password: 'Abcdefg1!',
        name: 'A',
      });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.role).toBe('user');
        expect(r.data.canViewAll).toBe(false);
      }
    });

    it('rejects power_user role', () => {
      const r = createUserSchema.safeParse({
        email: 'a@b.com', password: 'Abcdefg1!', name: 'A', role: 'power_user',
      });
      expect(r.success).toBe(false);
    });

    it('accepts canViewAll boolean', () => {
      const r = createUserSchema.safeParse({
        email: 'a@b.com', password: 'Abcdefg1!', name: 'A', canViewAll: true,
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.canViewAll).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts partial updates with canViewAll', () => {
      const r = updateUserSchema.safeParse({ canViewAll: true });
      expect(r.success).toBe(true);
    });
  });

  describe('createItemSchema', () => {
    it('requires name and positive purchasePrice', () => {
      expect(createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: 10 }).success).toBe(true);
      expect(createItemSchema.safeParse({ name: '', purchaseDate: '2024-01-01', purchasePrice: 10 }).success).toBe(false);
      expect(createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: -5 }).success).toBe(false);
    });

    it('coerces string price to number', () => {
      const r = createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: '25.00' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.purchasePrice).toBe(25);
    });
  });

  describe('updateItemSchema', () => {
    it('accepts partial updates including status', () => {
      expect(updateItemSchema.safeParse({ status: 'sold' }).success).toBe(true);
      expect(updateItemSchema.safeParse({ status: 'invalid' }).success).toBe(false);
    });
  });

  describe('createSaleSchema', () => {
    it('requires soldPrice and platform', () => {
      const r = createSaleSchema.safeParse({ soldDate: '2024-01-01', soldPrice: 50, platform: 'ebay' });
      expect(r.success).toBe(true);
    });
    it('rejects invalid platform', () => {
      expect(createSaleSchema.safeParse({ soldDate: '2024-01-01', soldPrice: 50, platform: 'walmart' }).success).toBe(false);
    });
    it('allows nullable itemId', () => {
      const r = createSaleSchema.safeParse({ soldDate: '2024-01-01', soldPrice: 50, platform: 'local', itemId: null });
      expect(r.success).toBe(true);
    });
  });

  describe('refundSchema', () => {
    it('requires refundType of refund_no_return or refund_with_return', () => {
      expect(refundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'refund_with_return' }).success).toBe(true);
      expect(refundSchema.safeParse({ saleId: 1, refundAmount: 10, refundType: 'none' }).success).toBe(false);
    });
  });

  describe('createMileageSchema', () => {
    it('requires date and non-negative miles', () => {
      expect(createMileageSchema.safeParse({ date: '2024-01-01', miles: 50 }).success).toBe(true);
      expect(createMileageSchema.safeParse({ date: '2024-01-01', miles: -1 }).success).toBe(false);
    });
  });

  describe('importSchema', () => {
    it('requires type inventory|sales|mileage', () => {
      const r = importSchema.safeParse({ type: 'inventory', csvData: 'a,b\n1,2' });
      expect(r.success).toBe(true);
      expect(importSchema.safeParse({ type: 'other', csvData: 'x' }).success).toBe(false);
    });
    it('rejects csvData over 1MB', () => {
      const big = 'x'.repeat(1_048_577);
      expect(importSchema.safeParse({ type: 'inventory', csvData: big }).success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('requires strong new password', () => {
      expect(changePasswordSchema.safeParse({ type: 'password', currentPassword: 'old', newPassword: 'Abcdefg1!' }).success).toBe(true);
      expect(changePasswordSchema.safeParse({ type: 'password', currentPassword: 'old', newPassword: 'weak' }).success).toBe(false);
    });
  });
});