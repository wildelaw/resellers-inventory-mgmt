import Papa from 'papaparse';

export interface ParsedCsv<T = Record<string, string>> {
  headers: string[];
  rows: T[];
  errors: string[];
}

/** Parse CSV text into rows using PapaParse. */
export function parseCsv<T = Record<string, string>>(csvData: string): ParsedCsv<T> {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = result.meta.fields ?? [];
  const errors: string[] = (result.errors || []).map((e) => `Row ${e.row ?? '?'}: ${e.message}`);

  return {
    headers: headers.map((h) => h),
    rows: result.data as T[],
    errors,
  };
}

/**
 * Default fuzzy column mappings. Keys are canonical field names; values are the
 * list of header aliases (lowercased) that map to that field.
 */
export const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'purchase date '],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'cost price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'source', 'where bought'],
  category: ['category', 'type', 'department'],
  notes: ['notes', 'comments', 'note'],
  status: ['status', 'item status'],
};

export const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'item_id', 'id'],
  itemName: ['item name', 'name', 'title', 'item'],
  soldDate: ['sold date', 'sale date', 'date sold', 'date', 'sold_date'],
  soldPrice: ['sold price', 'sale price', 'price', 'amount', 'sold_price'],
  shippingCost: ['shipping cost', 'shipping', 'ship cost', 'shipping_cost'],
  shippingCollected: ['shipping collected', 'shipping paid', 'shipping_collected'],
  platform: ['platform', 'marketplace', 'site'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'fee', 'platform_fees'],
};

export const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date', 'entry date'],
  miles: ['miles', 'mileage', 'distance', 'mi'],
  fromLocation: ['from location', 'from', 'start', 'origin', 'from_location'],
  toLocation: ['to location', 'to', 'destination', 'dest', 'to_location'],
  address: ['address', 'addr'],
  vehicle: ['vehicle', 'car', 'truck'],
  purpose: ['purpose', 'reason', 'business purpose'],
};

/**
 * Build a mapping from canonical field → actual CSV header name.
 * Honors an explicit `columnMappings` override first, then falls back to fuzzy matching.
 */
export function resolveColumnMapping(
  headers: string[],
  mappings: Record<string, string[]>,
  explicit?: Record<string, string>,
): Record<string, string | null> {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const result: Record<string, string | null> = {};

  for (const [field, aliases] of Object.entries(mappings)) {
    // Explicit override first (maps canonical field → actual header text).
    if (explicit && explicit[field]) {
      const desired = explicit[field].toLowerCase();
      const idx = lowerHeaders.findIndex((h) => h === desired);
      if (idx >= 0) {
        result[field] = headers[idx];
        continue;
      }
    }
    // Fuzzy match against aliases.
    const aliasList = aliases.map((a) => a.toLowerCase());
    const idx = lowerHeaders.findIndex((h) => aliasList.includes(h));
    result[field] = idx >= 0 ? headers[idx] : null;
  }

  return result;
}

/** Read a field value from a row given a resolved column mapping. */
export function getField(
  row: Record<string, string>,
  mapping: Record<string, string | null>,
  field: string,
): string | null {
  const header = mapping[field];
  if (!header) return null;
  const value = row[header];
  if (value === undefined || value === null || value === '') return null;
  return value;
}

/**
 * Fuzzy-match a sale CSV row against a user's inventory items.
 * Returns the best matching item id or null.
 */
export function fuzzyMatchItem(
  candidates: { id: number; name: string; purchaseDate: number; purchasePrice: number }[],
  itemName: string,
  purchaseDate?: number | null,
  purchasePrice?: number | null,
): number | null {
  if (!candidates.length || !itemName) return null;

  // 1. Exact name match.
  const exact = candidates.find((c) => c.name.toLowerCase() === itemName.toLowerCase());
  if (exact) return exact.id;

  // 2. Name contains + date within 1 day + price within $1.
  const fuzzy = candidates.find((c) => {
    const nameOk = c.name.toLowerCase().includes(itemName.toLowerCase()) ||
      itemName.toLowerCase().includes(c.name.toLowerCase());
    if (!nameOk) return false;
    const dateOk = purchaseDate ? Math.abs(c.purchaseDate - purchaseDate) <= 86400 : true;
    const priceOk = purchasePrice ? Math.abs(c.purchasePrice - purchasePrice) <= 1 : true;
    return dateOk && priceOk;
  });
  if (fuzzy) return fuzzy.id;

  return null;
}
