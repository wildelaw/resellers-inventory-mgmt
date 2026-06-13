import Papa from 'papaparse';

export interface ColumnMapping {
  [csvColumn: string]: string;
}

export interface ParseResult {
  data: Record<string, string>[];
  errors: string[];
  headers: string[];
}

const inventoryColumnMappings: ColumnMapping = {
  name: 'name',
  'item name': 'name',
  title: 'name',
  description: 'description',
  'purchase date': 'purchaseDate',
  'date purchased': 'purchaseDate',
  purchase_date: 'purchaseDate',
  date: 'purchaseDate',
  'acquired date': 'purchaseDate',
  'purchase price': 'purchasePrice',
  cost: 'purchasePrice',
  'price paid': 'purchasePrice',
  purchase_price: 'purchasePrice',
  'buy price': 'purchasePrice',
  'purchase location': 'purchaseLocation',
  'where bought': 'purchaseLocation',
  store: 'purchaseLocation',
  category: 'category',
  status: 'status',
  notes: 'notes',
  metadata: 'metadata',
};

const salesColumnMappings: ColumnMapping = {
  'item id': 'itemId',
  item_id: 'itemId',
  'item name': 'itemName',
  item_name: 'itemName',
  'sold date': 'soldDate',
  sold_date: 'soldDate',
  'sale date': 'soldDate',
  sale_date: 'soldDate',
  date: 'soldDate',
  'sold price': 'soldPrice',
  sold_price: 'soldPrice',
  'sale price': 'soldPrice',
  sale_price: 'soldPrice',
  price: 'soldPrice',
  'shipping cost': 'shippingCost',
  shipping_cost: 'shippingCost',
  'shipping collected': 'shippingCollected',
  shipping_collected: 'shippingCollected',
  platform: 'platform',
  'sales tax': 'salesTax',
  sales_tax: 'salesTax',
  tax: 'salesTax',
  'platform fees': 'platformFees',
  platform_fees: 'platformFees',
  fees: 'platformFees',
};

const mileageColumnMappings: ColumnMapping = {
  date: 'date',
  miles: 'miles',
  distance: 'miles',
  'from location': 'fromLocation',
  from: 'fromLocation',
  'to location': 'toLocation',
  to: 'toLocation',
  address: 'address',
  vehicle: 'vehicle',
  purpose: 'purpose',
  reason: 'purpose',
};

export function getColumnMappings(type: 'inventory' | 'sales' | 'mileage'): ColumnMapping {
  switch (type) {
    case 'inventory': return inventoryColumnMappings;
    case 'sales': return salesColumnMappings;
    case 'mileage': return mileageColumnMappings;
  }
}

export function parseCSV(csvData: string): ParseResult {
  const result: ParseResult = { data: [], errors: [], headers: [] };
  
  const parsed = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`);
  }

  result.headers = parsed.meta.fields || [];
  result.data = parsed.data as Record<string, string>[];

  return result;
}

export function mapColumns(
  data: Record<string, string>[],
  type: 'inventory' | 'sales' | 'mileage',
  customMappings?: ColumnMapping
): Record<string, string>[] {
  const defaultMappings = getColumnMappings(type);
  const mappings = { ...defaultMappings, ...customMappings };

  return data.map(row => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().trim();
      const targetField = mappings[normalizedKey];
      if (targetField) {
        mapped[targetField] = value;
      }
    }
    return mapped;
  });
}

export function fuzzyMatchItem(itemName: string, csvName: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return normalize(itemName).includes(normalize(csvName)) || normalize(csvName).includes(normalize(itemName));
}