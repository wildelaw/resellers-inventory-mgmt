import { describe, it, expect } from 'vitest';
import { parseCSV, matchColumn, buildColumnMapping, mapRow, fuzzyMatchItem, inventoryColumnMappings, salesColumnMappings } from '../../src/lib/csv-parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('parses simple CSV', () => {
      const result = parseCSV('name,price\nItem 1,10.00\nItem 2,20.00');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Item 1');
      expect(result.data[0].price).toBe('10.00');
    });

    it('handles empty CSV', () => {
      const result = parseCSV('');
      expect(result.data).toHaveLength(0);
    });

    it('handles headers with whitespace', () => {
      const result = parseCSV('  name  , price \nItem 1, 10.00');
      expect(result.headers).toContain('name');
      expect(result.headers).toContain('price');
    });
  });

  describe('matchColumn', () => {
    it('matches exact column name', () => {
      expect(matchColumn('name', inventoryColumnMappings)).toBe('name');
    });

    it('matches alias', () => {
      expect(matchColumn('Item Name', inventoryColumnMappings)).toBe('name');
      expect(matchColumn('title', inventoryColumnMappings)).toBe('name');
    });

    it('matches case-insensitively', () => {
      expect(matchColumn('PURCHASE PRICE', inventoryColumnMappings)).toBe('purchasePrice');
    });

    it('returns null for unmatched', () => {
      expect(matchColumn('unknown_field', inventoryColumnMappings)).toBeNull();
    });

    it('matches partial names', () => {
      expect(matchColumn('purchase price amount', inventoryColumnMappings)).toBe('purchasePrice');
    });
  });

  describe('buildColumnMapping', () => {
    it('builds mapping from headers', () => {
      const mapping = buildColumnMapping(['Name', 'Purchase Price', 'Unknown'], inventoryColumnMappings);
      expect(mapping['Name']).toBe('name');
      expect(mapping['Purchase Price']).toBe('purchasePrice');
      expect(mapping['Unknown']).toBeUndefined();
    });

    it('respects user-provided mappings', () => {
      const mapping = buildColumnMapping(['Custom'], inventoryColumnMappings, { 'Custom': 'name' });
      expect(mapping['Custom']).toBe('name');
    });
  });

  describe('mapRow', () => {
    it('maps row data using mapping', () => {
      const row = { 'Name': 'Test Item', 'Price': '25.00', 'Unused': 'ignore' };
      const mapping = { 'Name': 'name', 'Price': 'purchasePrice' };
      const result = mapRow(row, mapping);
      expect(result.name).toBe('Test Item');
      expect(result.purchasePrice).toBe('25.00');
      expect(result.unused).toBeUndefined();
    });

    it('skips empty values', () => {
      const row = { 'Name': 'Test', 'Price': '' };
      const mapping = { 'Name': 'name', 'Price': 'purchasePrice' };
      const result = mapRow(row, mapping);
      expect(result.name).toBe('Test');
      expect(result.purchasePrice).toBeUndefined();
    });
  });

  describe('fuzzyMatchItem', () => {
    const items = [
      { id: 1, name: 'Vintage Jacket', purchaseDate: 1705276800, purchasePrice: 25 },
      { id: 2, name: 'Blue Jeans', purchaseDate: 1705363200, purchasePrice: 15 },
    ];

    it('matches exact name', () => {
      expect(fuzzyMatchItem('Vintage Jacket', items)).toEqual({ id: 1 });
    });

    it('matches case-insensitively', () => {
      expect(fuzzyMatchItem('vintage jacket', items)).toEqual({ id: 1 });
    });

    it('matches partial name', () => {
      expect(fuzzyMatchItem('Jacket', items)).toEqual({ id: 1 });
    });

    it('returns null for no match', () => {
      expect(fuzzyMatchItem('Nonexistent Item', items)).toBeNull();
    });
  });
});