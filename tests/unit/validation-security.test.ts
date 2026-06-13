import { describe, it, expect } from 'vitest';
import { createItemSchema, createUserSchema } from '@/lib/validations';

describe('Validation Security', () => {
  describe('XSS prevention', () => {
    it('allows normal text in item name', () => {
      const result = createItemSchema.safeParse({
        name: 'Vintage Jacket',
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(true);
    });

    it('accepts names up to 200 chars', () => {
      const result = createItemSchema.safeParse({
        name: 'A'.repeat(200),
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects names over 200 chars', () => {
      const result = createItemSchema.safeParse({
        name: 'A'.repeat(201),
        purchaseDate: '2024-01-15',
        purchasePrice: '25.00',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Negative prices', () => {
    it('rejects negative purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '-10',
      });
      expect(result.success).toBe(false);
    });

    it('rejects zero purchase price', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '0',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Email validation', () => {
    it('accepts valid emails', () => {
      const result = createUserSchema.safeParse({
        email: 'user@example.com',
        password: 'SecureP@ss1',
        name: 'User',
        role: 'user',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid emails', () => {
      const result = createUserSchema.safeParse({
        email: 'not-an-email',
        password: 'SecureP@ss1',
        name: 'User',
        role: 'user',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Oversized inputs', () => {
    it('rejects oversized description', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '10',
        description: 'A'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('rejects oversized notes', () => {
      const result = createItemSchema.safeParse({
        name: 'Test',
        purchaseDate: '2024-01-15',
        purchasePrice: '10',
        notes: 'N'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});