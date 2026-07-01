import { describe, it, expect } from 'vitest';
import { createItemSchema, createUserSchema, createSaleSchema } from '@/lib/validations';

describe('validation security', () => {
  it('rejects oversized name', () => {
    const longName = 'a'.repeat(201);
    const result = createItemSchema.safeParse({
      name: longName,
      purchaseDate: '2024-01-15',
      purchasePrice: '10',
    });
    expect(result.success).toBe(false);
  });

  it('rejects oversized description', () => {
    const longDesc = 'a'.repeat(2001);
    const result = createItemSchema.safeParse({
      name: 'Test',
      description: longDesc,
      purchaseDate: '2024-01-15',
      purchasePrice: '10',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative prices', () => {
    const result = createItemSchema.safeParse({
      name: 'Test',
      purchaseDate: '2024-01-15',
      purchasePrice: '-5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without special character', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'NoSpecial123',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'lowercase123!',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'NoDigitHere!',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'Sh0rt!',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password longer than 128 chars', () => {
    const result = createUserSchema.safeParse({
      email: 'test@example.com',
      password: 'A' + 'a1!'.repeat(43),
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts string values with special characters (XSS payload)', () => {
    const result = createItemSchema.safeParse({
      name: '<script>alert("xss")</script>',
      purchaseDate: '2024-01-15',
      purchasePrice: '10',
    });
    // Zod accepts the string — sanitization happens at render time via React
    expect(result.success).toBe(true);
  });

  it('rejects negative sold price', () => {
    const result = createSaleSchema.safeParse({
      soldDate: '2024-01-15',
      soldPrice: '-100',
      platform: 'ebay',
    });
    expect(result.success).toBe(false);
  });
});