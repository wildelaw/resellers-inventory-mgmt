import { describe, it, expect } from 'vitest';
import { parseCsv, autoMapColumns, applyMappings, validateRequiredFields } from '@/lib/csv-parser';

describe('CSV Parser', () => {
  describe('parseCsv', () => {
    it('parses CSV data with headers', () => {
      const csv = 'name,purchase_price,purchase_date\nJacket,25.00,2024-01-15\nShirt,10.00,2024-02-01';
      const result = parseCsv(csv);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Jacket');
      expect(result.data[0].purchase_price).toBe('25.00');
    });

    it('handles empty CSV', () => {
      const result = parseCsv('');
      expect(result.data).toHaveLength(0);
    });

    it('reports parse errors', () => {
      const csv = 'name,price\n"unclosed quote';
      const result = parseCsv(csv);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('autoMapColumns', () => {
    it('maps inventory columns', () => {
      const headers = ['Name', 'Purchase Price', 'Purchase Date'];
      const mappings = autoMapColumns(headers, 'inventory');
      expect(mappings['Name']).toBe('name');
      expect(mappings['Purchase Price']).toBe('purchasePrice');
      expect(mappings['Purchase Date']).toBe('purchaseDate');
    });

    it('maps sales columns', () => {
      const headers = ['Sold Price', 'Platform', 'Sold Date'];
      const mappings = autoMapColumns(headers, 'sales');
      expect(mappings['Sold Price']).toBe('soldPrice');
      expect(mappings['Platform']).toBe('platform');
    });

    it('maps mileage columns', () => {
      const headers = ['Date', 'Miles', 'Vehicle'];
      const mappings = autoMapColumns(headers, 'mileage');
      expect(mappings['Date']).toBe('date');
      expect(mappings['Miles']).toBe('miles');
    });

    it('returns empty mapping for unrecognized columns', () => {
      const headers = ['Unknown Column'];
      const mappings = autoMapColumns(headers, 'inventory');
      expect(Object.keys(mappings)).toHaveLength(0);
    });
  });

  describe('applyMappings', () => {
    it('applies column mappings to data', () => {
      const data = [
        { Name: 'Jacket', 'Purchase Price': '25.00' },
        { Name: 'Shirt', 'Purchase Price': '10.00' },
      ];
      const mappings = { Name: 'name', 'Purchase Price': 'purchasePrice' };
      const result = applyMappings(data, mappings);
      expect(result[0].name).toBe('Jacket');
      expect(result[0].purchasePrice).toBe('25.00');
    });
  });

  describe('validateRequiredFields', () => {
    it('passes validation when required fields present', () => {
      const data = [{ name: 'Item', purchasePrice: 10 }];
      const result = validateRequiredFields(data, ['name']);
      expect(result.valid).toBe(true);
    });

    it('fails validation when required fields missing', () => {
      const data = [{ purchasePrice: 10 }];
      const result = validateRequiredFields(data, ['name']);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});