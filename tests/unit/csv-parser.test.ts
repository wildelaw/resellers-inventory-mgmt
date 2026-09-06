import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  normalizeHeader,
  fuzzyScore,
  mapColumns,
  inventoryColumnMappings,
  salesColumnMappings,
  parsePrice,
  parseDateValue,
  normalizePlatform,
  normalizeRefundType,
} from '@/lib/csv-parser';

describe('parseCsv', () => {
  it('parses header + rows into objects', () => {
    const { data, errors } = parseCsv('name,price\nLamp,10\nChair,5');
    expect(errors).toEqual([]);
    expect(data).toEqual([
      { name: 'Lamp', price: '10' },
      { name: 'Chair', price: '5' },
    ]);
  });

  it('trims headers', () => {
    const { data } = parseCsv(' name , price \nLamp,10');
    expect(Object.keys(data[0])).toEqual(['name', 'price']);
  });

  it('skips empty lines', () => {
    const { data } = parseCsv('name\nLamp\n\n\nChair');
    expect(data).toHaveLength(2);
  });

  it('handles quoted values containing commas', () => {
    const { data } = parseCsv('name,price\n"Lamp, brass",10');
    expect(data[0].name).toBe('Lamp, brass');
  });

  it('reports parse errors for malformed rows', () => {
    const { errors } = parseCsv('name,price\nLamp,10,extra');
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('normalizeHeader', () => {
  it('lowercases and collapses separators', () => {
    expect(normalizeHeader('Purchase_Price')).toBe('purchase price');
    expect(normalizeHeader('  Sold-Date  ')).toBe('sold date');
    expect(normalizeHeader('Item   Name')).toBe('item name');
  });
});

describe('fuzzyScore', () => {
  it('scores exact matches 1', () => {
    expect(fuzzyScore('Item Name', 'item_name')).toBe(1);
  });
  it('scores substring matches 0.8', () => {
    expect(fuzzyScore('item name (required)', 'item name')).toBe(0.8);
  });
  it('scores token overlap proportionally', () => {
    expect(fuzzyScore('sale date purchased', 'purchase date')).toBeGreaterThan(0);
    expect(fuzzyScore('completely different', 'purchase price')).toBe(0);
  });
});

describe('mapColumns', () => {
  it('maps exact header variants', () => {
    const result = mapColumns(['Item Name', 'Cost', 'Date'], inventoryColumnMappings);
    expect(result.name).toBe('Item Name');
    expect(result.purchasePrice).toBe('Cost');
    expect(result.purchaseDate).toBe('Date');
  });

  it('uses fuzzy matching for near misses', () => {
    const result = mapColumns(['Product Title', 'Price Paid'], inventoryColumnMappings);
    expect(result.name).toBe('Product Title');
    expect(result.purchasePrice).toBe('Price Paid');
  });

  it('leaves fields unmapped when no header is close', () => {
    const result = mapColumns(['zzz'], inventoryColumnMappings);
    expect(result.name).toBeUndefined();
  });

  it('prefers user-provided mappings over defaults', () => {
    const result = mapColumns(['Title', 'Amount'], salesColumnMappings, { soldPrice: 'Amount', itemName: 'Title' });
    expect(result.soldPrice).toBe('Amount');
    expect(result.itemName).toBe('Title');
  });

  it('ignores provided mappings that do not exist in the CSV', () => {
    const result = mapColumns(['Price'], salesColumnMappings, { soldPrice: 'Nonexistent' });
    expect(result.soldPrice).toBe('Price');
  });
});

describe('parsePrice', () => {
  it('parses plain and currency-formatted values', () => {
    expect(parsePrice('10')).toBe(10);
    expect(parsePrice('$19.99')).toBe(19.99);
    expect(parsePrice(' 1,250.50 ')).toBe(1250.5);
  });
  it('returns null for junk', () => {
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('')).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
    expect(parsePrice(null)).toBeNull();
  });
});

describe('parseDateValue', () => {
  it('parses ISO dates', () => {
    expect(parseDateValue('2026-01-15')).toBeInstanceOf(Date);
  });
  it('parses US-style dates', () => {
    expect(parseDateValue('01/15/2026')).toBeInstanceOf(Date);
  });
  it('returns null for junk', () => {
    expect(parseDateValue('not a date')).toBeNull();
    expect(parseDateValue('')).toBeNull();
    expect(parseDateValue(undefined)).toBeNull();
  });
});

describe('normalizePlatform', () => {
  it('maps known variants to canonical platform values', () => {
    expect(normalizePlatform('eBay')).toBe('ebay');
    expect(normalizePlatform('facebook marketplace')).toBe('facebook');
    expect(normalizePlatform('Poshmark')).toBe('poshmark');
  });
  it('falls back to other for unknown platforms', () => {
    expect(normalizePlatform('craigslist')).toBe('other');
    expect(normalizePlatform('')).toBe('other');
    expect(normalizePlatform(null)).toBe('other');
  });
});

describe('normalizeRefundType', () => {
  it('maps refund variants', () => {
    expect(normalizeRefundType('refund_with_return')).toBe('refund_with_return');
    expect(normalizeRefundType('with return')).toBe('refund_with_return');
    expect(normalizeRefundType('refund_no_return')).toBe('refund_no_return');
    expect(normalizeRefundType('no return')).toBe('refund_no_return');
    expect(normalizeRefundType('refund')).toBe('refund_no_return');
  });
  it('defaults to none', () => {
    expect(normalizeRefundType('')).toBe('none');
    expect(normalizeRefundType('partial refund')).toBe('none');
    expect(normalizeRefundType(null)).toBe('none');
  });
});