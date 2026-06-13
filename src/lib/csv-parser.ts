import Papa from 'papaparse';

// Column mapping for fuzzy matching CSV headers to field names
const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'where purchased', 'purchase_location'],
  category: ['category', 'type', 'item category'],
  notes: ['notes', 'comments', 'note', 'additional notes'],
  status: ['status', 'item status', 'current status'],
};

const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'itemid', 'item_id', 'item number'],
  itemName: ['item name', 'item', 'item_name'],
  soldDate: ['sold date', 'sale date', 'date sold', 'sold_date', 'date'],
  soldPrice: ['sold price', 'sale price', 'selling price', 'sold_price', 'price'],
  shippingCost: ['shipping cost', 'shipping', 'ship cost', 'shipping_cost'],
  shippingCollected: ['shipping collected', 'shipping paid by buyer', 'shipping_collected'],
  platform: ['platform', 'sale platform', 'marketplace'],
  salesTax: ['sales tax', 'tax', 'sales_tax'],
  platformFees: ['platform fees', 'fees', 'platform fee', 'platform_fees'],
};

const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date', 'mileage date'],
  miles: ['miles', 'distance', 'mileage', 'miles driven'],
  fromLocation: ['from', 'start location', 'from location', 'from_location'],
  toLocation: ['to', 'end location', 'to location', 'to_location'],
  address: ['address', 'destination address'],
  vehicle: ['vehicle', 'car', 'vehicle name'],
  purpose: ['purpose', 'reason', 'trip purpose', 'business purpose'],
};

interface ParseResult {
  data: Record<string, unknown>[];
  errors: string[];
  columnMap: Record<string, string>;
}

/**
 * Parse CSV data into structured rows.
 */
export function parseCsv(csvData: string): { data: Record<string, string>[]; errors: string[] } {
  const result = Papa.parse<Record<string, string>>(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  const errors = result.errors.map((e) => `Row ${e.row ?? 'unknown'}: ${e.message}`);
  return { data: result.data, errors };
}

/**
 * Map CSV columns to model fields using fuzzy matching.
 */
export function mapColumns(
  csvHeaders: string[],
  mappings: Record<string, string[]>
): Record<string, string> {
  const columnMap: Record<string, string> = {};

  for (const [field, aliases] of Object.entries(mappings)) {
    for (const header of csvHeaders) {
      const lowerHeader = header.toLowerCase().trim();
      if (aliases.includes(lowerHeader)) {
        columnMap[field] = header;
        break;
      }
    }
  }

  return columnMap;
}

/**
 * Parse and map inventory CSV data.
 */
export function parseInventoryCsv(csvData: string, columnMappings?: Record<string, string>): ParseResult {
  const { data, errors: parseErrors } = parseCsv(csvData);
  if (data.length === 0) {
    return { data: [], errors: [...parseErrors, 'No data rows found in CSV'], columnMap: {} };
  }

  const headers = Object.keys(data[0]);
  const columnMap = columnMappings || mapColumns(headers, inventoryColumnMappings);

  const mappedData = data.map((row, index) => {
    const mapped: Record<string, unknown> = {};
    for (const [field, csvColumn] of Object.entries(columnMap)) {
      const value = row[csvColumn];
      if (value !== undefined && value !== '') {
        if (field === 'purchasePrice') {
          mapped[field] = parseFloat(value);
        } else if (field === 'purchaseDate') {
          mapped[field] = parseDateValue(value);
        } else {
          mapped[field] = value;
        }
      }
    }

    // Name is required
    if (!mapped.name) {
      parseErrors.push(`Row ${index + 2}: missing item name`);
      return null;
    }

    return mapped;
  }).filter(Boolean);

  return { data: mappedData as Record<string, unknown>[], errors: parseErrors, columnMap };
}

/**
 * Parse and map sales CSV data.
 */
export function parseSalesCsv(csvData: string, columnMappings?: Record<string, string>): ParseResult {
  const { data, errors: parseErrors } = parseCsv(csvData);
  if (data.length === 0) {
    return { data: [], errors: [...parseErrors, 'No data rows found in CSV'], columnMap: {} };
  }

  const headers = Object.keys(data[0]);
  const columnMap = columnMappings || mapColumns(headers, salesColumnMappings);

  const mappedData = data.map((row, index) => {
    const mapped: Record<string, unknown> = {};
    for (const [field, csvColumn] of Object.entries(columnMap)) {
      const value = row[csvColumn];
      if (value !== undefined && value !== '') {
        if (['soldPrice', 'shippingCost', 'shippingCollected', 'salesTax', 'platformFees'].includes(field)) {
          mapped[field] = parseFloat(value) || 0;
        } else if (field === 'itemId') {
          const num = parseInt(value, 10);
          if (!isNaN(num)) mapped[field] = num;
        } else if (field === 'soldDate') {
          mapped[field] = parseDateValue(value);
        } else {
          mapped[field] = value;
        }
      }
    }

    // soldPrice is required
    if (!mapped.soldPrice) {
      parseErrors.push(`Row ${index + 2}: missing sold price`);
      return null;
    }

    return mapped;
  }).filter(Boolean);

  return { data: mappedData as Record<string, unknown>[], errors: parseErrors, columnMap };
}

/**
 * Parse and map mileage CSV data.
 */
export function parseMileageCsv(csvData: string, columnMappings?: Record<string, string>): ParseResult {
  const { data, errors: parseErrors } = parseCsv(csvData);
  if (data.length === 0) {
    return { data: [], errors: [...parseErrors, 'No data rows found in CSV'], columnMap: {} };
  }

  const headers = Object.keys(data[0]);
  const columnMap = columnMappings || mapColumns(headers, mileageColumnMappings);

  const mappedData = data.map((row, index) => {
    const mapped: Record<string, unknown> = {};
    for (const [field, csvColumn] of Object.entries(columnMap)) {
      const value = row[csvColumn];
      if (value !== undefined && value !== '') {
        if (field === 'miles') {
          mapped[field] = parseFloat(value) || 0;
        } else if (field === 'date') {
          mapped[field] = parseDateValue(value);
        } else {
          mapped[field] = value;
        }
      }
    }

    // Date and miles are required
    if (!mapped.date) {
      parseErrors.push(`Row ${index + 2}: missing date`);
      return null;
    }
    if (!mapped.miles) {
      parseErrors.push(`Row ${index + 2}: missing miles`);
      return null;
    }

    return mapped;
  }).filter(Boolean);

  return { data: mappedData as Record<string, unknown>[], errors: parseErrors, columnMap };
}

/**
 * Parse a date value from CSV (supports multiple formats).
 */
function parseDateValue(value: string): number | null {
  // Try ISO format
  const iso = Date.parse(value);
  if (!isNaN(iso)) return Math.floor(iso / 1000);

  // Try MM/DD/YYYY
  const parts = value.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    // Assume MM/DD/YYYY
    const date = new Date(a > 1000 ? a : 2000 + a, a > 1000 ? b - 1 : a - 1, a > 1000 ? c : b > 12 ? a : b);
    if (!isNaN(date.getTime())) return Math.floor(date.getTime() / 1000);
  }

  return null;
}

export { inventoryColumnMappings, salesColumnMappings, mileageColumnMappings };