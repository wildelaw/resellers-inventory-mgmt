import Papa from 'papaparse';

export interface CsvRow {
  [key: string]: string;
}

export interface ParsedCsv {
  data: CsvRow[];
  errors: string[];
}

/** Parses CSV text into row objects. */
export function parseCsv(csvData: string): ParsedCsv {
  const result = Papa.parse<CsvRow>(csvData, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const errors = (result.errors || []).map((e) => {
    const row = e.row !== undefined ? ` (row ${e.row + 1})` : '';
    return `CSV parse error: ${e.message}${row}`;
  });

  return { data: result.data || [], errors };
}

/** Lowercases, trims, and normalizes underscores/spaces for header comparison. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

/** Simple similarity score for fuzzy header matching (0–1). */
export function fuzzyScore(candidate: string, target: string): number {
  const c = normalizeHeader(candidate);
  const t = normalizeHeader(target);
  if (c === t) return 1;
  if (c.includes(t) || t.includes(c)) return 0.8;
  // Token overlap score
  const cTokens = new Set(c.split(' '));
  const tTokens = new Set(t.split(' '));
  if (cTokens.size === 0 || tTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of tTokens) {
    if (cTokens.has(token)) overlap++;
  }
  return overlap / Math.max(cTokens.size, tTokens.size);
}

export type ColumnMappings = Record<string, string[]>;

// Default column mappings per import type. Keys are schema field names,
// values are acceptable CSV header variants (best match wins).
export const inventoryColumnMappings: ColumnMappings = {
  name: ['name', 'item name', 'title', 'description', 'product'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'date acquired', 'bought'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'source', 'where purchased'],
  category: ['category', 'type', 'item type'],
  description: ['description', 'notes', 'details'],
  status: ['status', 'condition', 'state'],
  notes: ['notes', 'comments', 'remarks'],
};

export const salesColumnMappings: ColumnMappings = {
  itemId: ['item id', 'item_id', 'id', 'inventory id'],
  itemName: ['item name', 'name', 'title', 'item'],
  soldDate: ['sold date', 'date sold', 'sale date', 'date', 'sold_date'],
  soldPrice: ['sold price', 'sale price', 'price', 'sold_price', 'amount'],
  shippingCost: ['shipping cost', 'shipping_cost', 'shipping'],
  shippingCollected: ['shipping collected', 'shipping_collected', 'shipping charged', 'shipping paid'],
  platform: ['platform', 'channel', 'marketplace', 'venue'],
  salesTax: ['sales tax', 'sales_tax', 'tax'],
  platformFees: ['platform fees', 'platform_fees', 'fees', 'fee'],
  refundAmount: ['refund amount', 'refund_amount', 'refund'],
  refundReason: ['refund reason', 'refund_reason'],
  refundType: ['refund type', 'refund_type'],
};

export const mileageColumnMappings: ColumnMappings = {
  date: ['date', 'trip date', 'mileage date'],
  miles: ['miles', 'mileage', 'distance', 'mi'],
  fromLocation: ['from location', 'from', 'start', 'from_location', 'origin'],
  toLocation: ['to location', 'to', 'destination', 'to_location', 'end'],
  address: ['address', 'location address'],
  vehicle: ['vehicle', 'car', 'truck'],
  purpose: ['purpose', 'reason', 'notes'],
};

/**
 * Maps CSV headers to schema field names.
 * `provided` takes precedence (user-supplied mapping: field -> header).
 */
export function mapColumns(
  headers: string[],
  fieldMappings: ColumnMappings,
  provided?: Record<string, string>
): Record<string, string> {
  const normalized = headers.map((h) => ({ header: h, normalized: normalizeHeader(h) }));
  const result: Record<string, string> = {};

  for (const [field, candidates] of Object.entries(fieldMappings)) {
    // 1. Explicit user-provided mapping wins
    if (provided && provided[field]) {
      const match = normalized.find((h) => h.header === provided[field]);
      if (match) {
        result[field] = match.header;
        continue;
      }
    }

    // 2. Exact normalized match
    let best: { header: string; score: number } | null = null;
    for (const candidate of candidates) {
      const target = normalizeHeader(candidate);
      const exact = normalized.find((h) => h.normalized === target);
      if (exact) {
        best = { header: exact.header, score: 1 };
        break;
      }
    }

    // 3. Fuzzy match
    if (!best) {
      for (const candidate of candidates) {
        for (const h of normalized) {
          const score = fuzzyScore(h.header, candidate);
          if (score >= 0.8 && (!best || score > best.score)) {
            best = { header: h.header, score };
          }
        }
      }
    }

    if (best) result[field] = best.header;
  }

  return result;
}

/** Parses a price-ish string into a number. Returns null when unparseable. */
export function parsePrice(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/** Parses a date-ish string into a timestamp. Returns null when unparseable. */
export function parseDateValue(value: string | undefined | null): Date | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const str = String(value).trim();

  // ISO / common formats
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const d2 = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

export function normalizePlatform(value: string | undefined | null): string {
  const v = (value || '').toLowerCase().trim();
  const map: Record<string, string> = {
    'facebook': 'facebook', 'facebook marketplace': 'facebook', 'fb': 'facebook', 'fbm': 'facebook',
    'instagram': 'instagram', 'ig': 'instagram',
    'ebay': 'ebay',
    'poshmark': 'poshmark',
    'mercari': 'mercari',
    'consignment': 'consignment',
    'local': 'local', 'in person': 'local', 'cash': 'local',
  };
  return map[v] || 'other';
}

export function normalizeRefundType(value: string | undefined | null): string {
  const v = (value || '').toLowerCase().trim();
  if (v === 'refund_no_return' || v.includes('no return') || v === 'refund') return 'refund_no_return';
  if (v === 'refund_with_return' || v.includes('with return') || v.includes('return')) return 'refund_with_return';
  return 'none';
}