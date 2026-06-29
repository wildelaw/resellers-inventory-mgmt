import Papa from 'papaparse';

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(csvData: string): ParsedCsvResult {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter((r) => r && Object.keys(r).length > 0);
  return { headers, rows };
}

// Column mapping: canonical field -> list of acceptable source header names
const COLUMN_ALIASES = {
  // items
  name: ['name', 'item name', 'title', 'description', 'item'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'acquired'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'price'],
  purchaseLocation: ['purchase location', 'location', 'where bought', 'purchase_location', 'store'],
  category: ['category', 'type', 'group'],
  notes: ['notes', 'note', 'comments', 'comment'],
  status: ['status', 'state'],
  // sales
  itemId: ['item id', 'itemid', 'item_id', 'id', 'inventory id'],
  itemName: ['item name', 'name', 'title', 'item'],
  soldDate: ['sold date', 'sale date', 'date sold', 'sold_date', 'sale_date', 'date'],
  soldPrice: ['sold price', 'sale price', 'price sold', 'sold_price', 'sale_price', 'selling price', 'revenue'],
  platform: ['platform', 'marketplace', 'channel', 'sold on'],
  shippingCost: ['shipping cost', 'shipping', 'ship cost', 'shipping_cost'],
  shippingCollected: ['shipping collected', 'shipping paid', 'shipping_collected'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'fee', 'platform_fees'],
  // mileage
  date: ['date', 'mileage date', 'trip date'],
  miles: ['miles', 'mileage', 'distance'],
  fromLocation: ['from', 'from location', 'start', 'origin', 'from_location'],
  toLocation: ['to', 'to location', 'destination', 'dest', 'to_location'],
  address: ['address', 'addr'],
  vehicle: ['vehicle', 'car'],
  purpose: ['purpose', 'reason', 'note'],
} as const;

export type CanonicalField = keyof typeof COLUMN_ALIASES;

const ALIAS_INDEX: Record<string, CanonicalField> = (() => {
  const idx: Record<string, CanonicalField> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const key = normalizeHeader(alias);
      if (!(key in idx)) idx[key] = field as CanonicalField;
    }
  }
  return idx;
})();

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Map CSV headers to canonical fields using exact-then-fuzzy matching.
 * Returns a record of canonicalField -> sourceHeader.
 */
export function mapColumns(
  headers: string[],
  overrides?: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  const used = new Set<string>();

  // 1. Overrides first (canonical -> source header)
  if (overrides) {
    for (const [field, sourceHeader] of Object.entries(overrides)) {
      const match = headers.find((h) => h === sourceHeader && !used.has(h));
      if (match) {
        result[field] = match;
        used.add(match);
      }
    }
  }

  // 2. Exact (normalized) match against alias index
  for (const header of headers) {
    if (used.has(header)) continue;
    const norm = normalizeHeader(header);
    const field = ALIAS_INDEX[norm];
    if (field && !result[field]) {
      result[field] = header;
      used.add(header);
    }
  }

  // 3. Fuzzy: contains match against aliases (lowest priority)
  for (const header of headers) {
    if (used.has(header)) continue;
    const lower = header.toLowerCase();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (result[field]) continue;
      if (aliases.some((a) => lower.includes(a))) {
        result[field] = header;
        used.add(header);
        break;
      }
    }
  }

  return result;
}

/**
 * Normalize a row to canonical field keys using a column map.
 */
export function normalizeRow(
  row: Record<string, string>,
  columnMap: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, sourceHeader] of Object.entries(columnMap)) {
    out[field] = row[sourceHeader] ?? '';
  }
  return out;
}

// Fuzzy item matching for sales import
export interface ItemLookupMatch {
  id: number | null;
  matchedBy: 'id' | 'name-exact' | 'fuzzy' | 'none';
}

export function fuzzyMatchScore(
  a: { name: string; purchasePrice?: number | null; purchaseDate?: number | null },
  b: { name: string; purchasePrice?: number | null; purchaseDate?: number | null },
): number {
  const aName = a.name.toLowerCase();
  const bName = b.name.toLowerCase();
  if (!aName || !bName) return 0;
  // simple contains score
  let score = 0;
  if (aName === bName) score += 100;
  else if (aName.includes(bName) || bName.includes(aName)) score += 60;
  else if (aName.split(/\s+/).some((w) => w && bName.includes(w))) score += 30;
  // price proximity (within $1)
  if (
    a.purchasePrice !== null && a.purchasePrice !== undefined &&
    b.purchasePrice !== null && b.purchasePrice !== undefined
  ) {
    if (Math.abs(a.purchasePrice - b.purchasePrice) <= 1) score += 20;
  }
  // date proximity (within 1 day)
  if (
    a.purchaseDate !== null && a.purchaseDate !== undefined &&
    b.purchaseDate !== null && b.purchaseDate !== undefined
  ) {
    if (Math.abs(a.purchaseDate - b.purchaseDate) <= 86_400_000) score += 10;
  }
  return score;
}