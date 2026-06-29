import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  createSaleSchema,
  setupSchema,
  createMileageSchema,
  createUserSchema,
  importSchema,
} from '@/lib/validations';

describe('validation security', () => {
  describe('XSS / injection in strings', () => {
    it('accepts strings with HTML (the API must encode on render, not reject input)', () => {
      const r = createItemSchema.safeParse({
        name: '<script>alert(1)</script>',
        purchaseDate: '2024-01-01',
        purchasePrice: 10,
      });
      expect(r.success).toBe(true);
    });

    it('limits name length to 200 chars', () => {
      const long = 'a'.repeat(201);
      expect(createItemSchema.safeParse({ name: long, purchaseDate: '2024-01-01', purchasePrice: 10 }).success).toBe(false);
    });

    it('limits description to 2000 chars', () => {
      const long = 'a'.repeat(2001);
      const r = createItemSchema.safeParse({
        name: 'X', description: long, purchaseDate: '2024-01-01', purchasePrice: 10,
      });
      expect(r.success).toBe(false);
    });
  });

  describe('SQL injection patterns in search fields', () => {
    it('does not break on SQL-like input (escaping happens at query layer)', () => {
      const r = createItemSchema.safeParse({
        name: "'; DROP TABLE items; --",
        purchaseDate: '2024-01-01',
        purchasePrice: 10,
      });
      expect(r.success).toBe(true);
    });
  });

  describe('oversized inputs', () => {
    it('rejects csvData over 1MB', () => {
      const big = 'x'.repeat(1_048_577);
      const r = createSaleSchema.safeParse({
        soldDate: '2024-01-01', soldPrice: 50, platform: 'local',
      });
      expect(r.success).toBe(true);
      expect(importSchema.safeParse({ type: 'sales', csvData: big }).success).toBe(false);
    });

    it('rejects mileage miles > 100000', () => {
      expect(createMileageSchema.safeParse({ date: '2024-01-01', miles: 100001 }).success).toBe(false);
    });
  });

  describe('negative / invalid prices', () => {
    it('rejects negative purchasePrice', () => {
      expect(createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: -1 }).success).toBe(false);
    });

    it('rejects NaN purchasePrice', () => {
      const r = createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: Number.NaN });
      expect(r.success).toBe(false);
    });

    it('rejects non-finite purchasePrice', () => {
      const r = createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: Number.POSITIVE_INFINITY });
      expect(r.success).toBe(false);
    });

    it('rejects oversize price (> 1,000,000)', () => {
      expect(createItemSchema.safeParse({ name: 'X', purchaseDate: '2024-01-01', purchasePrice: 2_000_000 }).success).toBe(false);
    });
  });

  describe('password complexity', () => {
    it('rejects password without special char', () => {
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'Abcdefg1' }).success).toBe(false);
    });
    it('rejects password without digit', () => {
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'Abcdefgh!' }).success).toBe(false);
    });
    it('rejects password under 8 chars', () => {
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'Ab1!' }).success).toBe(false);
    });
    it('rejects password over 128 chars', () => {
      const long = 'Aa1!' + 'a'.repeat(130);
      expect(setupSchema.safeParse({ name: 'A', email: 'a@b.com', password: long }).success).toBe(false);
    });
  });

  describe('email validation', () => {
    it('lowercases and trims email', () => {
      const r = createUserSchema.safeParse({
        email: '  ADMIN@TEST.COM ', password: 'Abcdefg1!', name: 'A',
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('admin@test.com');
    });
  });
});