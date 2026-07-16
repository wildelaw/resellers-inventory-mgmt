import Papa from "papaparse";

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

const MAX_ROWS = 32000;
const MAX_BYTES = 1024 * 1024;

export function parseCsv(csvData: string): ParseResult {
  if (csvData.length > MAX_BYTES) {
    return {
      headers: [],
      rows: [],
      errors: [`CSV exceeds 1MB limit (${csvData.length} bytes)`],
    };
  }

  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
    transform: (v: string) => (typeof v === "string" ? v.trim() : v),
  });

  const rows = (result.data || []).slice(0, MAX_ROWS);
  const headers = (result.meta?.fields || []) as string[];
  const errors = (result.errors || []).map((e) => e.message);

  if ((result.data || []).length > MAX_ROWS) {
    errors.push(`Truncated to ${MAX_ROWS} rows`);
  }

  return { headers, rows, errors };
}

const INVENTORY_FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "item name", "title", "item"],
  purchaseDate: [
    "purchase date",
    "date purchased",
    "purchase_date",
    "date",
    "acquired date",
    "acquisition date",
    "buy date",
  ],
  purchasePrice: [
    "purchase price",
    "cost",
    "price paid",
    "purchase_price",
    "buy price",
    "price",
    "amount paid",
  ],
  purchaseLocation: [
    "purchase location",
    "location",
    "store",
    "where bought",
    "source",
  ],
  category: ["category", "type", "group"],
  description: ["description", "details", "notes"],
  status: ["status", "state"],
  notes: ["notes", "comment", "comments"],
};

const SALES_FIELD_ALIASES: Record<string, string[]> = {
  soldDate: [
    "sold date",
    "date sold",
    "sold_date",
    "sale date",
    "date",
    "sale",
  ],
  soldPrice: [
    "sold price",
    "sale price",
    "sold_price",
    "price",
    "amount",
    "total",
  ],
  platform: ["platform", "channel", "marketplace", "site"],
  itemId: ["item id", "item_id", "id"],
  itemName: ["item", "item name", "product", "name"],
  shippingCost: ["shipping cost", "shipping", "shipping_cost"],
  shippingCollected: [
    "shipping collected",
    "buyer paid shipping",
    "shipping_collected",
  ],
  salesTax: ["sales tax", "tax", "sales_tax"],
  platformFees: ["fees", "platform fees", "platform_fees", "commission"],
  refundAmount: ["refund", "refund amount", "refund_amount"],
  refundReason: ["refund reason", "refund_reason", "reason"],
  refundType: ["refund type", "refund_type", "refund status"],
};

const MILEAGE_FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "trip date", "mileage date"],
  miles: ["miles", "distance", "total miles"],
  fromLocation: ["from", "from location", "from_location", "start", "origin"],
  toLocation: ["to", "to location", "to_location", "destination", "end"],
  address: ["address", "location", "where"],
  vehicle: ["vehicle", "car", "auto"],
  purpose: ["purpose", "reason", "notes"],
};

export function buildColumnMappings(
  headers: string[],
  explicitMappings: Record<string, string> | undefined,
  type: "inventory" | "sales" | "mileage"
): Record<string, string> {
  const aliases =
    type === "inventory"
      ? INVENTORY_FIELD_ALIASES
      : type === "sales"
        ? SALES_FIELD_ALIASES
        : MILEAGE_FIELD_ALIASES;

  const headerLower = headers.map((h) => h.toLowerCase().trim());
  const mappings: Record<string, string> = {};

  for (const [field, variants] of Object.entries(aliases)) {
    if (explicitMappings?.[field]) {
      mappings[field] = explicitMappings[field];
      continue;
    }
    for (const variant of variants) {
      const idx = headerLower.indexOf(variant);
      if (idx >= 0) {
        mappings[field] = headers[idx];
        break;
      }
    }
  }

  return mappings;
}

export function findFuzzyItemMatch(
  items: Array<{
    id: number;
    name: string;
    purchaseDate: number;
    purchasePrice: number;
  }>,
  search: { name?: string; purchaseDate?: number; purchasePrice?: number }
): number | null {
  const nameLower = search.name?.toLowerCase().trim();
  if (!nameLower) return null;

  for (const item of items) {
    if (item.name.toLowerCase() === nameLower) return item.id;
  }
  for (const item of items) {
    if (item.name.toLowerCase().includes(nameLower)) {
      if (
        search.purchaseDate != null &&
        Math.abs(item.purchaseDate - search.purchaseDate) > 86400
      )
        continue;
      if (
        search.purchasePrice != null &&
        Math.abs(item.purchasePrice - search.purchasePrice) > 1
      )
        continue;
      return item.id;
    }
  }
  return null;
}
