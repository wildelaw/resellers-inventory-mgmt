import { describe, it, expect } from 'vitest';
import { parseCsv, buildColumnMap, getInventoryColumnMap, getSalesColumnMap, normalizeStatus, normalizePlatform, fuzzyMatchItemName } from '@/lib/csv-parser';

describe('csv-parser', () => {
  describe('parseCsv', () => {
    it('parses simple CSV', () => {
      const csv = 'name,price\nItem 1,10.00\nItem 2,20.00';
      const result = parseCsv(csv);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Item 1');
      expect(result.data[0].price).toBe('10.00');
    });

    it('handles empty lines', () => {
      const csv = 'name,price\nItem 1,10.00\n\nItem 2,20.00';
      const result = parseCsv(csv);
      expect(result.data).toHaveLength(2);
    });

    it('lowercases headers', () => {
      const csv = 'Name,Price\nItem,10';
      const result = parseCsv(csv);
      expect(result.headers).toContain('name');
      expect(result.headers).toContain('price');
    });
  });

  describe('buildColumnMap', () => {
    it('maps known headers', () => {
      const map = buildColumnMap(['name', 'price'], { name: ['name', 'item name'], price: ['price', 'cost'] });
      expect(map.name).toBe('name');
      expect(map.price).toBe('price');
    });

    it('maps alternative headers', () => {
      const map = buildColumnMap(['item name', 'cost'], { name: ['name', 'item name'], price: ['price', 'cost'] });
      expect(map.name).toBe('item name');
      expect(map.price).toBe('cost');
    });

    it('returns empty for unmapped columns', () => {
      const map = buildColumnMap(['unknown'], { name: ['name'] });
      expect(map.name).toBeUndefined();
    });
  });

  describe('getInventoryColumnMap', () => {
    it('maps inventory columns', () => {
      const map = getInventoryColumnMap(['name', 'purchase date', 'purchase price']);
      expect(map.name).toBe('name');
      expect(map.purchaseDate).toBe('purchase date');
      expect(map.purchasePrice).toBe('purchase price');
    });
  });

  describe('getSalesColumnMap', () => {
    it('maps sales columns', () => {
      const map = getSalesColumnMap(['item name', 'sold price', 'platform']);
      expect(map.itemName).toBe('item name');
      expect(map.soldPrice).toBe('sold price');
      expect(map.platform).toBe('platform');
    });
  });

  describe('normalizeStatus', () => {
    it('normalizes valid status', () => {
      expect(normalizeStatus('available')).toBe('available');
      expect(normalizeStatus('SOLD')).toBe('sold');
    });

    it('returns undefined for invalid status', () => {
      expect(normalizeStatus('invalid')).toBeUndefined();
      expect(normalizeStatus(undefined)).toBeUndefined();
    });
  });

  describe('normalizePlatform', () => {
    it('normalizes valid platform', () => {
      expect(normalizePlatform('ebay')).toBe('ebay');
      expect(normalizePlatform('EBAY')).toBe('ebay');
    });

    it('returns undefined for invalid platform', () => {
      expect(normalizePlatform('invalid')).toBeUndefined();
    });
  });

  describe('fuzzyMatchItemName', () => {
    it('matches exact name', () => {
      const candidates = [{ id: 1, name: 'Vintage Jacket' }];
      expect(fuzzyMatchItemName('Vintage Jacket', candidates)).toBe(1);
    });

    it('matches case-insensitive', () => {
      const candidates = [{ id: 1, name: 'Vintage Jacket' }];
      expect(fuzzyMatchItemName('vintage jacket', candidates)).toBe(1);
    });

    it('matches by contains', () => {
      const candidates = [{ id: 2, name: 'Vintage Jacket' }];
      expect(fuzzyMatchItemName('vintage', candidates)).toBe(2);
    });

    it('returns null for no match', () => {
      const candidates = [{ id: 1, name: 'Vintage Jacket' }];
      expect(fuzzyMatchItemName('completely different', candidates)).toBeNull();
    });
  });
});