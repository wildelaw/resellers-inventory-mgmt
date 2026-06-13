import { describe, it, expect } from 'vitest';
import { parseCsv, mapColumns, parseInventoryCsv, parseSalesCsv, parseMileageCsv, inventoryColumnMappings, salesColumnMappings, mileageColumnMappings } from '@/lib/csv-parser';

describe('CSV Parser', () => {
  describe('parseCsv', () => {
    it('parses simple CSV data', () => {
      const csv = 'name,price\nJacket,25\nShirt,15';
      const result = parseCsv(csv);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Jacket');
      expect(result.data[0].price).toBe('25');
    });

    it('handles empty CSV', () => {
      const result = parseCsv('');
      expect(result.data).toHaveLength(0);
    });

    it('trims header whitespace', () => {
      const csv = ' name , price \nJacket,25';
      const result = parseCsv(csv);
      expect(result.data[0]['name']).toBe('Jacket');
    });
  });

  describe('mapColumns', () => {
    it('maps known column names', () => {
      const headers = ['Item Name', 'Purchase Price', 'Category'];
      const result = mapColumns(headers, inventoryColumnMappings);
      expect(result.name).toBe('Item Name');
      expect(result.purchasePrice).toBe('Purchase Price');
      expect(result.category).toBe('Category');
    });

    it('returns empty object for no matches', () => {
      const headers = ['foo', 'bar'];
      const result = mapColumns(headers, inventoryColumnMappings);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('parseInventoryCsv', () => {
    it('parses valid inventory CSV', () => {
      const csv = 'name,purchase_price,purchase_date\nJacket,25.00,2024-01-15\nShirt,15.00,2024-02-01';
      const result = parseInventoryCsv(csv);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Jacket');
      expect(result.data[0].purchasePrice).toBe(25);
    });

    it('reports missing name errors', () => {
      const csv = 'name,purchase_price\n,25.00\nShirt,15.00';
      const result = parseInventoryCsv(csv);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseSalesCsv', () => {
    it('parses valid sales CSV', () => {
      const csv = 'sold_price,platform,sold_date\n100.00,ebay,2024-03-15';
      const result = parseSalesCsv(csv);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].soldPrice).toBe(100);
    });
  });

  describe('parseMileageCsv', () => {
    it('parses valid mileage CSV', () => {
      const csv = 'date,miles,purpose\n2024-01-15,45.5,Business trip';
      const result = parseMileageCsv(csv);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].miles).toBe(45.5);
    });

    it('reports missing date errors', () => {
      const csv = 'date,miles\n,45.5';
      const result = parseMileageCsv(csv);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('reports missing miles errors', () => {
      const csv = 'date,miles\n2024-01-15,';
      const result = parseMileageCsv(csv);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});