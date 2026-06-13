import { describe, it, expect } from 'vitest';
import { parseCSV, mapColumns, getColumnMappings } from '@/lib/csv-parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('parses valid CSV data', () => {
      const csv = 'name,purchase_date,purchase_price\nJacket,2024-01-15,25.00\nShirt,2024-02-01,15.00';
      const result = parseCSV(csv);
      expect(result.data).toHaveLength(2);
      expect(result.headers).toContain('name');
    });

    it('handles empty CSV', () => {
      const csv = 'name,price\n';
      const result = parseCSV(csv);
      expect(result.data).toHaveLength(0);
    });

    it('trims header whitespace', () => {
      const csv = ' name , price \nJacket,25.00';
      const result = parseCSV(csv);
      expect(result.headers).toContain('name');
    });
  });

  describe('mapColumns', () => {
    it('maps inventory columns using default mappings', () => {
      const data = [{ name: 'Jacket', purchase_date: '2024-01-15', purchase_price: '25.00' }];
      const result = mapColumns(data, 'inventory');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('purchaseDate');
      expect(result[0]).toHaveProperty('purchasePrice');
    });

    it('maps sales columns', () => {
      const data = [{ 'sold price': '100', platform: 'ebay' }];
      const result = mapColumns(data, 'sales');
      expect(result[0]).toHaveProperty('soldPrice');
      expect(result[0]).toHaveProperty('platform');
    });

    it('maps mileage columns', () => {
      const data = [{ date: '2024-01-15', miles: '25.5' }];
      const result = mapColumns(data, 'mileage');
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('miles');
    });

    it('applies custom column mappings', () => {
      const data = [{ 'Item Name': 'Jacket' }];
      const result = mapColumns(data, 'inventory', { 'item name': 'name' });
      expect(result[0]).toHaveProperty('name');
      expect(result[0].name).toBe('Jacket');
    });
  });

  describe('getColumnMappings', () => {
    it('returns inventory mappings', () => {
      const mappings = getColumnMappings('inventory');
      expect(mappings).toHaveProperty('name');
      expect(mappings).toHaveProperty('purchase price');
    });

    it('returns sales mappings', () => {
      const mappings = getColumnMappings('sales');
      expect(mappings).toHaveProperty('sold price');
      expect(mappings).toHaveProperty('platform');
    });

    it('returns mileage mappings', () => {
      const mappings = getColumnMappings('mileage');
      expect(mappings).toHaveProperty('date');
      expect(mappings).toHaveProperty('miles');
    });
  });
});