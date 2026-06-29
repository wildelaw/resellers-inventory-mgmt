import { describe, it, expect } from 'vitest';
import {
  parseCsv, csvHeaders, mapColumns, normalizeHeader,
  INVENTORY_COLUMN_ALIASES, SALES_COLUMN_ALIASES, fuzzyMatchScore,
} from '@/lib/csv-parser';

describe('parseCsv', () => {
  it('parses headers and rows', () => {
    const rows = parseCsv('name,price\nHat,25\nShirt,10');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Hat');
    expect(rows[0].price).toBe('25');
  });
  it('skips empty lines', () => {
    const rows = parseCsv('name\nA\n\nB');
    expect(rows).toHaveLength(2);
  });
  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toHaveLength(0);
  });
});

describe('csvHeaders', () => {
  it('returns the first row as headers', () => {
    expect(csvHeaders('a,b,c\n1,2,3')).toEqual(['a', 'b', 'c']);
  });
});

describe('normalizeHeader', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeHeader('Purchase Price!')).toBe('purchase price');
    expect(normalizeHeader('  Item-Name  ')).toBe('item name');
  });
});

describe('mapColumns', () => {
  it('maps canonical fields to actual headers via aliases', () => {
    const headers = ['Item Name', 'Cost', 'Date Purchased'];
    const m = mapColumns(headers, INVENTORY_COLUMN_ALIASES);
    expect(m.name).toBe('Item Name');
    expect(m.purchasePrice).toBe('Cost');
    expect(m.purchaseDate).toBe('Date Purchased');
  });
  it('honors caller-supplied overrides', () => {
    const headers = ['Title', 'Cost'];
    const m = mapColumns(headers, INVENTORY_COLUMN_ALIASES, { name: 'Title' });
    expect(m.name).toBe('Title');
  });
  it('leaves unmapped fields undefined', () => {
    const m = mapColumns(['unrelated'], SALES_COLUMN_ALIASES);
    expect(m.soldPrice).toBeUndefined();
  });
});

describe('fuzzyMatchScore', () => {
  it('scores exact name match highest', () => {
    const s = fuzzyMatchScore({ name: 'Hat' }, { name: 'Hat' });
    expect(s).toBeGreaterThanOrEqual(100);
  });
  it('scores substring match partially', () => {
    const s = fuzzyMatchScore({ name: 'Hat' }, { name: 'Red Hat' });
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(100);
  });
  it('scores zero for unrelated names', () => {
    const s = fuzzyMatchScore({ name: 'Hat' }, { name: 'Shirt' });
    expect(s).toBe(0);
  });
});