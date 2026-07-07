import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  createSaleSchema,
  createUserSchema,
  passwordSchema,
} from '../../src/lib/validations';

describe('Validation Security', () => {
  describe('XSS Prevention', () => {
    it('allows but limits script tags in description', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
        description: '<script>alert("xss")</script>',
      });
      expect(result.success).toBe(true);
      // The description is stored as-is; the UI should escape it
    });

    it('truncates overly long descriptions', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
        description: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SQL Injection Patterns', () => {
    it('allows single quotes in name (parameterized queries handle this)', () => {
      const result = createItemSchema.safeParse({
        name: "Test'; DROP TABLE items;--",
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Oversized Inputs', () => {
    it('rejects name over 200 chars', () => {
      const result = createItemSchema.safeParse({
        name: 'A'.repeat(201),
        purchaseDate: '2024-01-15',
        purchasePrice: 25,
      });
      expect(result.success).toBe(false);
    });

    it('rejects email over 255 chars', () => {
      const result = createUserSchema.safeParse({
        email: 'a'.repeat(250) + '@test.com',
        password: 'StrongP@ss1',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Negative Prices', () => {
    it('rejects negative purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative sold price', () => {
      const result = createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: -50,
        platform: 'ebay',
      });
      expect(result.success).toBe(false);
    });

    it('allows zero prices', () => {
      expect(createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: 0,
      }).success).toBe(true);

      expect(createSaleSchema.safeParse({
        soldDate: '2024-01-15',
        soldPrice: 0,
        platform: 'local',
      }).success).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('rejects password without complexity', () => {
      expect(passwordSchema.safeParse('password').success).toBe(false);
      expect(passwordSchema.safeParse('PASSWORD1!').success).toBe(false);
      expect(passwordSchema.safeParse('Password').success).toBe(false);
      expect(passwordSchema.safeParse('Password1').success).toBe(false);
    });

    it('accepts strong passwords', () => {
      expect(passwordSchema.safeParse('Str0ng!Pass').success).toBe(true);
      expect(passwordSchema.safeParse('Abcdef1!').success).toBe(true);
    });
  });
});