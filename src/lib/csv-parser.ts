import Papa from 'papaparse';

export interface ColumnMapping {
  [csvColumn: string]: string; // csvColumn -> modelField
}

export interface ParseResult {
  data: Record<string, unknown>[];
  errors: string[];
  totalRows: number;
}

// Fuzzy column name mappings
const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'date acquired'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'price'],
  purchaseLocation: ['purchase location', 'location', 'where purchased', 'purchase_location', 'store', 'source'],
  category: ['category', 'type', 'item type', 'item category'],
  notes: ['notes', 'note', 'comments', 'description', 'details'],
};

const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'item_id', 'item number'],
  soldDate: ['sold date', 'date sold', 'sale date', 'sold_date', 'sale_date', 'date'],
  soldPrice: ['sold price', 'sale price', 'selling price', 'sold_price', 'sale_price', 'price'],
  shippingCost: ['shipping cost', 'shipping', 'shipping_cost'],
  shippingCollected: ['shipping collected', 'shipping paid', 'shipping_collected'],
  platform: ['platform', 'selling platform', 'marketplace', 'sold on'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'platform_fees', 'selling fees'],
};

const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date', 'mileage date'],
  miles: ['miles', 'mileage', 'distance', 'miles driven'],
  fromLocation: ['from', 'from location', 'start', 'from_location', 'origin'],
  toLocation: ['to', 'to location', 'destination', 'to_location', 'end'],
  address: ['address', 'location'],
  vehicle: ['vehicle', 'car'],
  purpose: ['purpose', 'reason', 'trip purpose', 'business purpose'],
};

/**
 * Parse CSV data and return structured rows.
 */
export function parseCsv(csvData: string): ParseResult {
  const result = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
  });

  const errors: string[] = [];
  
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      errors.push(`Row ${error.row ?? 'unknown'}: ${error.message}`);
    }
  }

  const data = result.data as Record<string, unknown>[];

  return {
    data,
    errors,
    totalRows: data.length,
  };
}

/**
 * Auto-map CSV column headers to model field names.
 */
export function autoMapColumns(
  headers: string[],
  type: 'inventory' | 'sales' | 'mileage'
): ColumnMapping {
  const mappings = type === 'inventory' ? inventoryColumnMappings
    : type === 'sales' ? salesColumnMappings
    : mileageColumnMappings;

  const result: ColumnMapping = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  for (let i = 0; i < headers.length; i++) {
    const header = normalizedHeaders[i];
    for (const [field, aliases] of Object.entries(mappings)) {
      if (aliases.includes(header)) {
        result[headers[i]] = field;
        break;
      }
    }
  }

  return result;
}

/**
 * Apply column mappings to parsed CSV data.
 */
export function applyMappings(
  data: Record<string, unknown>[],
  mappings: ColumnMapping
): Record<string, unknown>[] {
  return data.map(row => {
    const mapped: Record<string, unknown> = {};
    for (const [csvCol, modelField] of Object.entries(mappings)) {
      if (row[csvCol] !== undefined && row[csvCol] !== null && row[csvCol] !== '') {
        mapped[modelField] = row[csvCol];
      }
    }
    return mapped;
  });
}

/**
 * Validate that required fields are present in mapped data.
 */
export function validateRequiredFields(
  data: Record<string, unknown>[],
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    for (const field of requiredFields) {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        errors.push(`Row ${index + 1}: Missing required field "${field}"`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}