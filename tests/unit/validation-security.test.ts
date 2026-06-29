import { describe, it, expect } from 'vitest';
import { createItemSchema, createSaleSchema, importSchema } from '@/lib/validations';
import { escapeLike } from '@/lib/api-utils';

describe('validation security', () => {
  it('accepts long but within-limit strings (2000 chars)', () => {
    const desc = 'x'.repeat(2000);
    expect(createItemSchema.safeParse({ name: 'A', purchaseDate: '2024-01-01', purchasePrice: 1, description: desc }).success).toBe(true);
  });

  it('rejects oversized description', () => {
    const desc = 'x'.repeat(2001);
    expect(createItemSchema.safeParse({ name: 'A', purchaseDate: '2024-01-01', purchasePrice: 1, description: desc }).success).toBe(false);
  });

  it('rejects negative prices', () => {
    expect(createItemSchema.safeParse({ name: 'A', purchaseDate: '2024-01-01', purchasePrice: -0.01 }).success).toBe(false);
    expect(createSaleSchema.safeParse({ soldDate: '2024-01-01', soldPrice: -1, platform: 'ebay' }).success).toBe(false);
  });

  it('rejects CSV import over 1MB', () => {
    const big = 'x'.repeat(1024 * 1024 + 1);
    expect(importSchema.safeParse({ type: 'inventory', csvData: big }).success).toBe(false);
  });

  it('escapes SQL LIKE wildcards in search input', () => {
    expect(escapeLike('%')).toBe('\\%');
    expect(escapeLike('_')).toBe('\\_');
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('does not allow script tags to break name field (stored as plain string)', () => {
    const r = createItemSchema.safeParse({ name: '<script>alert(1)</script>', purchaseDate: '2024-01-01', purchasePrice: 1 });
    expect(r.success).toBe(true);
    // The value is stored as-is; XSS prevention is via React escaping on render, not input rejection.
    if (r.success) expect(r.data.name).toBe('<script>alert(1)</script>');
  });
});