import Papa from 'papaparse';

/**
 * Convert sale records to CSV format for export.
 */
export function salesToCsv(sales: Record<string, unknown>[]): string {
  const headers = [
    'id', 'itemId', 'itemName', 'soldDate', 'soldPrice',
    'shippingCost', 'shippingCollected', 'platform', 'salesTax',
    'platformFees', 'refundAmount', 'refundType', 'refundReason',
    'soldBy', 'soldByName', 'createdAt',
  ];

  const rows = sales.map(sale => ({
    id: sale.id,
    itemId: sale.itemId ?? '',
    itemName: (sale as Record<string, unknown>).itemName ?? '',
    soldDate: sale.soldDate ? new Date((sale.soldDate as number) * 1000).toISOString() : '',
    soldPrice: sale.soldPrice ?? '',
    shippingCost: sale.shippingCost ?? '',
    shippingCollected: sale.shippingCollected ?? '',
    platform: sale.platform ?? '',
    salesTax: sale.salesTax ?? '',
    platformFees: sale.platformFees ?? '',
    refundAmount: sale.refundAmount ?? '',
    refundType: sale.refundType ?? '',
    refundReason: sale.refundReason ?? '',
    soldBy: sale.soldBy ?? '',
    soldByName: (sale as Record<string, unknown>).soldByName ?? '',
    createdAt: sale.createdAt ? new Date((sale.createdAt as number) * 1000).toISOString() : '',
  }));

  return Papa.unparse({ fields: headers, data: rows });
}

/**
 * Convert mileage records to CSV format for export.
 */
export function mileageToCsv(entries: Record<string, unknown>[]): string {
  const headers = [
    'id', 'date', 'miles', 'fromLocation', 'toLocation',
    'address', 'vehicle', 'purpose', 'ownerId', 'createdAt',
  ];

  const rows = entries.map(entry => ({
    id: entry.id,
    date: entry.date ? new Date((entry.date as number) * 1000).toISOString() : '',
    miles: entry.miles ?? '',
    fromLocation: entry.fromLocation ?? '',
    toLocation: entry.toLocation ?? '',
    address: entry.address ?? '',
    vehicle: entry.vehicle ?? '',
    purpose: entry.purpose ?? '',
    ownerId: entry.ownerId ?? '',
    createdAt: entry.createdAt ? new Date((entry.createdAt as number) * 1000).toISOString() : '',
  }));

  return Papa.unparse({ fields: headers, data: rows });
}

/**
 * Set response headers for CSV download.
 */
export function csvDownloadHeaders(filename: string): Record<string, string> {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}