import Papa from 'papaparse';

export interface ParsedCSV {
  data: Record<string, any>[];
  errors: string[];
}

/**
 * Parse CSV data with PapaParse
 */
export function parseCSV(csvData: string): ParsedCSV {
  const result = Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const errors: string[] = [];
  
  if (result.errors.length > 0) {
    result.errors.forEach(error => {
      errors.push(`Row ${error.row}: ${error.message}`);
    });
  }

  return {
    data: result.data as Record<string, any>[],
    errors,
  };
}

/**
 * Column mapping configurations for fuzzy matching
 */
export const inventoryColumnMappings: Record<string, string[]> = {
  name: ['name', 'item name', 'title', 'description', 'item', 'product'],
  purchaseDate: ['purchase date', 'date purchased', 'purchase_date', 'date', 'acquired date', 'bought date'],
  purchasePrice: ['purchase price', 'cost', 'price paid', 'purchase_price', 'buy price', 'price'],
  purchaseLocation: ['purchase location', 'location', 'store', 'source', 'purchased from'],
  category: ['category', 'type', 'item type', 'product type'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
};

export const salesColumnMappings: Record<string, string[]> = {
  itemId: ['item id', 'item_id', 'itemid', 'id'],
  itemName: ['item name', 'item_name', 'name', 'title', 'product'],
  soldDate: ['sold date', 'date sold', 'sold_date', 'date', 'sale date'],
  soldPrice: ['sold price', 'sale price', 'sold_price', 'price', 'amount'],
  shippingCost: ['shipping cost', 'shipping_cost', 'shipping', 'postage'],
  shippingCollected: ['shipping collected', 'shipping_collected', 'shipping received'],
  platform: ['platform', 'marketplace', 'channel', 'sold on'],
  salesTax: ['sales tax', 'sales_tax', 'tax'],
  platformFees: ['platform fees', 'platform_fees', 'fees', 'commission'],
};

export const mileageColumnMappings: Record<string, string[]> = {
  date: ['date', 'trip date', 'trip_date'],
  miles: ['miles', 'distance', 'mileage'],
  fromLocation: ['from', 'from location', 'from_location', 'start'],
  toLocation: ['to', 'to location', 'to_location', 'end', 'destination'],
  address: ['address', 'location'],
  vehicle: ['vehicle', 'car'],
  purpose: ['purpose', 'reason', 'description'],
};

/**
 * Find the best matching column name from CSV headers
 */
export function findMatchingColumn(
  headers: string[],
  possibleNames: string[]
): string | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Try exact match first
  for (const name of possibleNames) {
    const normalized = name.toLowerCase();
    if (normalizedHeaders.includes(normalized)) {
      return headers[normalizedHeaders.indexOf(normalized)];
    }
  }
  
  // Try fuzzy match (contains)
  for (const name of possibleNames) {
    const normalized = name.toLowerCase();
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedHeaders[i].includes(normalized) || normalized.includes(normalizedHeaders[i])) {
        return headers[i];
      }
    }
  }
  
  return null;
}

/**
 * Map CSV columns to expected field names
 */
export function mapColumns(
  data: Record<string, any>[],
  mappings: Record<string, string[]>,
  customMappings?: Record<string, string>
): Record<string, any>[] {
  if (data.length === 0) return [];
  
  const headers = Object.keys(data[0]);
  const columnMap: Record<string, string> = {};
  
  // Build column mapping
  for (const [field, possibleNames] of Object.entries(mappings)) {
    // Check custom mappings first
    if (customMappings && customMappings[field]) {
      columnMap[field] = customMappings[field];
    } else {
      const match = findMatchingColumn(headers, possibleNames);
      if (match) {
        columnMap[field] = match;
      }
    }
  }
  
  // Map data
  return data.map(row => {
    const mapped: Record<string, any> = {};
    
    for (const [field, csvColumn] of Object.entries(columnMap)) {
      if (row[csvColumn] !== undefined && row[csvColumn] !== null && row[csvColumn] !== '') {
        mapped[field] = row[csvColumn];
      }
    }
    
    return mapped;
  });
}

/**
 * Parse and estimate missing dates
 */
export function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Parse price from string (handles $, commas, etc.)
 */
export function parsePrice(priceStr: string | number | undefined): number | null {
  if (priceStr === undefined || priceStr === null || priceStr === '') {
    return null;
  }
  
  if (typeof priceStr === 'number') {
    return priceStr;
  }
  
  // Remove currency symbols and commas
  const cleaned = priceStr.toString().replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Fuzzy match item by name and date
 */
export function fuzzyMatchItem(
  searchName: string,
  searchDate: Date | null,
  searchPrice: number | null,
  items: Array<{
    id: number;
    name: string;
    purchaseDate: Date;
    purchasePrice: number;
  }>
): number | null {
  const normalizedSearch = searchName.toLowerCase().trim();
  
  for (const item of items) {
    const normalizedName = item.name.toLowerCase().trim();
    
    // Check if names match (contains or exact)
    const nameMatch = 
      normalizedName === normalizedSearch ||
      normalizedName.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedName);
    
    if (!nameMatch) continue;
    
    // Check date match (within 1 day)
    if (searchDate) {
      const dayDiff = Math.abs(
        item.purchaseDate.getTime() - searchDate.getTime()
      ) / (1000 * 60 * 60 * 24);
      
      if (dayDiff > 1) continue;
    }
    
    // Check price match (within $1)
    if (searchPrice !== null) {
      const priceDiff = Math.abs(item.purchasePrice - searchPrice);
      if (priceDiff > 1) continue;
    }
    
    return item.id;
  }
  
  return null;
}
