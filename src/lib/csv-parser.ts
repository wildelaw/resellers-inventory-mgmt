import Papa from 'papaparse';

export interface ParsedCSVResult {
  data: Record<string, string>[];
  headers: string[];
  errors: string[];
}

/**
 * Parse CSV string into array of row objects.
 */
export function parseCSV(csvData: string): ParsedCSVResult {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors: result.errors.map(e => `Row ${e.row}: ${e.message}`),
  };
}

// Column mapping definitions for fuzzy header matching
export const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'acquired'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'cost price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'where purchased', 'source'],
  category: ['category', 'type', 'item type', 'class'],
  notes: ['notes', 'comments', 'remarks', 'note'],
  description: ['description', 'details', 'item description'],
  status: ['status', 'item status'],
};

export const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'item', 'item_id'],
  itemName: ['item name', 'name', 'item', 'title'],
  soldDate: ['sold date', 'date sold', 'sale date', 'date', 'sold_date'],
  soldPrice: ['sold price', 'sale price', 'price', 'sold_price', 'selling price', 'sale amount'],
  shippingCost: ['shipping cost', 'shipping', 'ship cost', 'shipping_cost'],
  shippingCollected: ['shipping collected', 'shipping paid', 'shipping_collected'],
  platform: ['platform', 'marketplace', 'sold on', 'channel'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'fee', 'platform_fees', 'selling fees'],
};

export const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date', 'entry date'],
  miles: ['miles', 'mileage', 'distance', 'miles driven'],
  fromLocation: ['from', 'from location', 'origin', 'start', 'from_location'],
  toLocation: ['to', 'to location', 'destination', 'end', 'to_location'],
  address: ['address', 'location address'],
  vehicle: ['vehicle', 'car', 'vehicle name'],
  purpose: ['purpose', 'reason', 'trip purpose', 'business purpose'],
};

/**
 * Fuzzy-match a header to a canonical field name.
 */
export function matchColumn(
  header: string,
  mappings: Record<string, string[]>
): string | null {
  const normalized = header.toLowerCase().trim();

  for (const [field, aliases] of Object.entries(mappings)) {
    if (aliases.includes(normalized) || field === normalized) {
      return field;
    }
  }

  // Try partial match
  for (const [field, aliases] of Object.entries(mappings)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return field;
      }
    }
  }

  return null;
}

/**
 * Build a column mapping from CSV headers to canonical field names.
 */
export function buildColumnMapping(
  headers: string[],
  mappings: Record<string, string[]>,
  userMappings?: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const header of headers) {
    // Check user-provided mappings first
    if (userMappings && userMappings[header]) {
      result[header] = userMappings[header];
      continue;
    }

    const matched = matchColumn(header, mappings);
    if (matched) {
      result[header] = matched;
    }
  }

  return result;
}

/**
 * Convert a row using the column mapping to a canonical object.
 */
export function mapRow(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [header, field] of Object.entries(mapping)) {
    if (row[header] !== undefined && row[header] !== '') {
      result[field] = row[header];
    }
  }

  return result;
}

/**
 * Fuzzy match item name with date and price proximity.
 */
export function fuzzyMatchItem(
  name: string,
  items: Array<{ id: number; name: string; purchaseDate: number; purchasePrice: number }>
): { id: number } | null {
  const normalized = name.toLowerCase().trim();

  // Exact match first
  const exact = items.find(i => i.name.toLowerCase().trim() === normalized);
  if (exact) return { id: exact.id };

  // Partial match with date+price proximity
  for (const item of items) {
    if (item.name.toLowerCase().includes(normalized) || normalized.includes(item.name.toLowerCase())) {
      return { id: item.id };
    }
  }

  return null;
}