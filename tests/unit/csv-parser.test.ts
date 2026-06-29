import { describe, it, expect } from 'vitest';
import { parseCsv, mapColumns, normalizeRow, fuzzyMatchScore } from '@/lib/csv-parser';

describe('csv-parser', () => {
  describe('parseCsv', () => {
    it('parses a basic CSV with headers', () => {
      const csv = 'name,purchase_date,purchase_price\nJacket,2024-01-15,25.00\nShoes,2024-02-01,15.50';
      const { headers, rows } = parseCsv(csv);
      expect(headers).toEqual(['name', 'purchase_date', 'purchase_price']);
      expect(rows.length).toBe(2);
      expect(rows[0].name).toBe('Jacket');
      expect(rows[1].purchase_price).toBe('15.50');
    });

    it('skips empty lines', () => {
      const csv = 'a,b\n1,2\n\n3,4\n';
      const { rows } = parseCsv(csv);
      expect(rows.length).toBe(2);
    });

    it('trims header whitespace', () => {
      const csv = '  name  , price \nJacket, 25';
      const { headers } = parseCsv(csv);
      expect(headers).toEqual(['name', 'price']);
    });

    it('handles empty input', () => {
      const { headers, rows } = parseCsv('');
      expect(headers).toEqual([]);
      expect(rows).toEqual([]);
    });
  });

  describe('mapColumns', () => {
    it('maps exact-then-normalized aliases', () => {
      const headers = ['Item Name', 'Purchase Price', 'Date Purchased'];
      const map = mapColumns(headers);
      expect(map.name).toBe('Item Name');
      expect(map.purchasePrice).toBe('Purchase Price');
      expect(map.purchaseDate).toBe('Date Purchased');
    });

    it('respects explicit overrides first', () => {
      const headers = ['A', 'B', 'C'];
      const map = mapColumns(headers, { name: 'A', purchasePrice: 'B' });
      expect(map.name).toBe('A');
      expect(map.purchasePrice).toBe('B');
    });

    it('falls back to fuzzy contains matching', () => {
      const headers = ['The Item Name Field', 'What It Cost Me'];
      const map = mapColumns(headers);
      expect(map.name).toBeTruthy();
      expect(map.purchasePrice).toBeTruthy();
    });

    it('does not double-assign a header', () => {
      const headers = ['name'];
      const map = mapColumns(headers);
      expect(map.name).toBe('name');
      // only one field mapped
      expect(Object.keys(map).length).toBe(1);
    });
  });

  describe('normalizeRow', () => {
    it('renames source keys to canonical fields', () => {
      const row = { 'Item Name': 'Jacket', 'Price': '25.00', unused: 'x' };
      const map = { name: 'Item Name', purchasePrice: 'Price' };
      const out = normalizeRow(row, map);
      expect(out.name).toBe('Jacket');
      expect(out.purchasePrice).toBe('25.00');
      expect(out.unused).toBeUndefined();
    });
  });

  describe('fuzzyMatchScore', () => {
    it('scores exact name match highest', () => {
      const a = { name: 'Vintage Jacket', purchasePrice: 25, purchaseDate: 1000 };
      const b = { name: 'vintage jacket', purchasePrice: 25, purchaseDate: 1000 };
      expect(fuzzyMatchScore(a, b)).toBeGreaterThanOrEqual(100);
    });

    it('scores substring match lower than exact', () => {
      const a = { name: 'Vintage Jacket', purchasePrice: null, purchaseDate: null };
      const b = { name: 'jacket', purchasePrice: null, purchaseDate: null };
      expect(fuzzyMatchScore(a, b)).toBeGreaterThan(0);
      expect(fuzzyMatchScore(a, b)).toBeLessThan(100);
    });

    it('returns 0 when either name is empty', () => {
      expect(fuzzyMatchScore({ name: '' }, { name: 'x' })).toBe(0);
      expect(fuzzyMatchScore({ name: 'x' }, { name: '' })).toBe(0);
    });

    it('adds bonus for price within $1', () => {
      const a = { name: 'Jacket', purchasePrice: 25, purchaseDate: null };
      const b = { name: 'Jacket', purchasePrice: 25.5, purchaseDate: null };
      expect(fuzzyMatchScore(a, b)).toBeGreaterThan(100);
    });
  });
});