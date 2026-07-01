import Papa from 'papaparse';
import { ALL_STATUSES, ALL_PLATFORMS, type ItemStatus, type SalePlatform } from './constants';

export interface ParsedCsvResult {
  data: Record<string, string>[];
  errors: string[];
  headers: string[];
}

export function parseCsv(csvData: string): ParsedCsvResult {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  return {
    data: result.data,
    errors: result.errors.map((e) => `Row ${e.row}: ${e.message}`),
    headers: result.meta.fields || [],
  };
}

// ─── Column mapping (fuzzy header matching) ─────────────────────────────────
const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'where bought'],
  category: ['category', 'type'],
  notes: ['notes', 'comments', 'note'],
  status: ['status', 'item status'],
};

const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'item_id'],
  itemName: ['item name', 'name', 'item'],
  soldDate: ['sold date', 'date sold', 'sale date', 'date'],
  soldPrice: ['sold price', 'sale price', 'price', 'sold_price'],
  shippingCost: ['shipping cost', 'shipping'],
  shippingCollected: ['shipping collected', 'shipping paid'],
  platform: ['platform', 'marketplace', 'site'],
  salesTax: ['sales tax', 'tax'],
  platformFees: ['platform fees', 'fees', 'fee'],
};

const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date'],
  miles: ['miles', 'mileage', 'distance'],
  fromLocation: ['from', 'from location', 'start', 'origin'],
  toLocation: ['to', 'to location', 'destination', 'end'],
  address: ['address'],
  vehicle: ['vehicle', 'car'],
  purpose: ['purpose', 'reason', 'note'],
};

export function buildColumnMap(
  headers: string[],
  mapping: Record<string, string[]>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [target, candidates] of Object.entries(mapping)) {
    for (const header of headers) {
      const lower = header.toLowerCase().trim();
      if (candidates.includes(lower)) {
        result[target] = header;
        break;
      }
    }
  }
  return result;
}

export function getInventoryColumnMap(headers: string[]) {
  return buildColumnMap(headers, inventoryColumnMappings);
}
export function getSalesColumnMap(headers: string[]) {
  return buildColumnMap(headers, salesColumnMappings);
}
export function getMileageColumnMap(headers: string[]) {
  return buildColumnMap(headers, mileageColumnMappings);
}

export function normalizeStatus(value: string | undefined): ItemStatus | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if ((ALL_STATUSES as string[]).includes(lower)) return lower as ItemStatus;
  return undefined;
}

export function normalizePlatform(value: string | undefined): SalePlatform | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if ((ALL_PLATFORMS as string[]).includes(lower)) return lower as SalePlatform;
  return undefined;
}

export function fuzzyMatchItemName(name: string, candidates: { id: number; name: string }[]): number | null {
  const lower = name.toLowerCase().trim();
  // Exact match
  const exact = candidates.find((c) => c.name.toLowerCase().trim() === lower);
  if (exact) return exact.id;
  // Contains match
  const contains = candidates.find(
    (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()),
  );
  if (contains) return contains.id;
  return null;
}