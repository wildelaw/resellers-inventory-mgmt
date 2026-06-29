/**
 * CSV parsing wrapper (PapaParse) with fuzzy column mapping.
 */
import Papa from 'papaparse';

export type ColumnMappings = Record<string, string>;

/** Canonical field -> candidate header aliases (lowercased). */
export const INVENTORY_COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'item', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'acquired'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'price'],
  purchaseLocation: ['purchase location', 'location', 'where bought', 'store', 'source'],
  category: ['category', 'type', 'group'],
  notes: ['notes', 'note', 'comments', 'comment'],
  description: ['description', 'desc', 'details'],
  status: ['status', 'item status'],
};

export const SALES_COLUMN_ALIASES: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'id', 'item'],
  itemName: ['item name', 'name', 'title', 'item'],
  soldDate: ['sold date', 'date sold', 'sale date', 'date', 'sold_date'],
  soldPrice: ['sold price', 'sale price', 'price', 'sold_price', 'amount'],
  shippingCost: ['shipping cost', 'ship cost', 'shipping_cost', 'shipping'],
  shippingCollected: ['shipping collected', 'shipping paid', 'shipping_collected'],
  platform: ['platform', 'site', 'marketplace'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'fee', 'platform_fees'],
};

export const MILEAGE_COLUMN_ALIASES: Record<string, string[]> = {
  date: ['date', 'trip date', 'entry date'],
  miles: ['miles', 'mileage', 'distance'],
  fromLocation: ['from', 'from location', 'start', 'origin'],
  toLocation: ['to', 'to location', 'destination', 'dest'],
  address: ['address', 'addr'],
  vehicle: ['vehicle', 'car'],
  purpose: ['purpose', 'reason', 'note'],
};

/** Normalize a header for matching: lowercase, trimmed, alnum+space+underscore. */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[\s-]+/g, ' ').replace(/[^a-z0-9 _]/g, '').trim();
}

/**
 * Given the CSV's headers and a canonical alias map, produce a mapping of
 * canonical field -> actual header in the CSV. Honors caller-supplied
 * columnMappings (canonical field -> header) overrides first.
 */
export function mapColumns(
  headers: string[],
  aliases: Record<string, string[]>,
  overrides?: ColumnMappings,
): Record<string, string | undefined> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const result: Record<string, string | undefined> = {};

  for (const field of Object.keys(aliases)) {
    if (overrides && overrides[field]) {
      const match = normalized.find((h) => h.raw === overrides[field] || h.norm === normalizeHeader(overrides[field]));
      if (match) { result[field] = match.raw; continue; }
    }
    const candidates = aliases[field].map(normalizeHeader);
    const found = normalized.find((h) => candidates.includes(h.norm));
    result[field] = found?.raw;
  }
  return result;
}

/** Parse CSV text into an array of row objects. */
export function parseCsv(csvData: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return result.data.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === undefined || v === null) out[k] = '';
      else out[k] = String(v);
    }
    return out;
  });
}

/** Get the unique headers present in the CSV (in order). */
export function csvHeaders(csvData: string): string[] {
  const result = Papa.parse<string[]>(csvData, { preview: 1 });
  const row = result.data[0];
  return row ? row.map((h) => h.trim()) : [];
}

/** Fuzzy-match an item by name + close purchaseDate/price within tolerances. */
export function fuzzyMatchScore(
  a: { name: string; purchaseDate?: number | null; purchasePrice?: number | null },
  b: { name: string; purchaseDate?: number | null; purchasePrice?: number | null },
): number {
  const nameA = a.name.toLowerCase().trim();
  const nameB = b.name.toLowerCase().trim();
  let score = 0;
  if (nameA === nameB) score += 100;
  else if (nameA && (nameA.includes(nameB) || nameB.includes(nameA))) score += 60;
  if (a.purchaseDate && b.purchaseDate && Math.abs(a.purchaseDate - b.purchaseDate) <= 86400) score += 20;
  if (
    a.purchasePrice != null && b.purchasePrice != null &&
    Math.abs(Number(a.purchasePrice) - Number(b.purchasePrice)) <= 1
  ) score += 20;
  return score;
}