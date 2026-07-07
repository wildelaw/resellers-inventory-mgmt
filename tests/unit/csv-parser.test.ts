import { describe, it, expect } from 'vitest';
import { parseCsv, resolveColumnMapping, getField, fuzzyMatchItem, inventoryColumnMappings } from '@/lib/csv-parser';

describe('csv-parser', () => {
  describe('parseCsv', () => {
    it('parses simple CSV', () => {
      const result = parseCsv('name,price\nItem1,10\nItem2,20');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe('Item1');
    });

    it('handles empty data', () => {
      const result = parseCsv('');
      expect(result.rows).toHaveLength(0);
    });

    it('lowercases headers', () => {
      const result = parseCsv('Name,Price\nItem1,10');
      expect(result.headers).toContain('name');
    });
  });

  describe('resolveColumnMapping', () => {
    it('maps standard headers', () => {
      const mapping = resolveColumnMapping(['name', 'purchase price', 'date'], inventoryColumnMappings);
      expect(mapping.name).toBe('name');
      expect(mapping.purchasePrice).toBe('purchase price');
    });

    it('maps fuzzy headers', () => {
      const mapping = resolveColumnMapping(['item name', 'cost'], inventoryColumnMappings);
      expect(mapping.name).toBe('item name');
      expect(mapping.purchasePrice).toBe('cost');
    });

    it('returns null for unmatched fields', () => {
      const mapping = resolveColumnMapping(['foo'], inventoryColumnMappings);
      expect(mapping.name).toBeNull();
    });
  });

  describe('fuzzyMatchItem', () => {
    const candidates = [
      { id: 1, name: 'Vintage Jacket', purchaseDate: 1705276800, purchasePrice: 25 },
      { id: 2, name: 'Blue Jeans', purchaseDate: 1705363200, purchasePrice: 15 },
    ];

    it('matches exact name', () => {
      expect(fuzzyMatchItem(candidates, 'Vintage Jacket')).toBe(1);
    });
    it('matches case-insensitive exact', () => {
      expect(fuzzyMatchItem(candidates, 'vintage jacket')).toBe(1);
    });
    it('matches fuzzy (name contains)', () => {
      expect(fuzzyMatchItem(candidates, 'Vintage', 1705276800, 25)).toBe(1);
    });
    it('returns null for no match', () => {
      expect(fuzzyMatchItem(candidates, 'Nonexistent Item')).toBeNull();
    });
    it('returns null for empty candidates', () => {
      expect(fuzzyMatchItem([], 'Test')).toBeNull();
    });
  });
});
