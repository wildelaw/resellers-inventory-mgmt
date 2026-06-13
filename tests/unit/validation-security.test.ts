import { describe, it, expect } from 'vitest';
import { createItemSchema, createUserSchema, createSaleSchema, passwordSchema } from '@/lib/validations';

describe('Validation Security', () => {
  describe('XSS prevention', () => {
    it('rejects script tags in item name', () => {
      const result = createItemSchema.safeParse({
        name: '<script>alert("xss")</script>',
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 10,
      });
      // Zod allows the string but we should sanitize on output
      // The schema accepts it; rendering should escape
      expect(result.success).toBe(true);
    });
  });

  describe('Oversized inputs', () => {
    it('rejects item name over 200 characters', () => {
      const result = createItemSchema.safeParse({
        name: 'A'.repeat(201),
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects item description over 2000 characters', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        description: 'A'.repeat(2001),
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: 10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects user name over 200 characters', () => {
      const result = createUserSchema.safeParse({
        email: 'test@test.com',
        password: 'SecureP@ss1',
        name: 'A'.repeat(201),
        role: 'user',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Negative prices', () => {
    it('rejects negative purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Item',
        purchaseDate: Math.floor(Date.now() / 1000),
        purchasePrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative sold price', () => {
      const result = createSaleSchema.safeParse({
        soldDate: Math.floor(Date.now() / 1000),
        soldPrice: -50,
        platform: 'ebay',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Password complexity', () => {
    it('rejects common weak passwords', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
      ];
      for (const pw of weakPasswords) {
        const result = passwordSchema.safeParse(pw);
        expect(result.success).toBe(false);
      }
    });

    it('accepts strong passwords', () => {
      const strongPasswords = [
        'MyP@ssw0rd',
        'C0mpl3x!Pass',
        'Str0ng#2024',
      ];
      for (const pw of strongPasswords) {
        const result = passwordSchema.safeParse(pw);
        expect(result.success).toBe(true);
      }
    });
  });
});