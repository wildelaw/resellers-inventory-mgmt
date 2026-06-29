/**
 * CSV export utilities — build CSV text from row objects and stream as a download.
 */
import Papa from 'papaparse';

/** Convert an array of records to CSV text. */
export function toCsv(rows: Record<string, unknown>[], fields?: string[]): string {
  if (rows.length === 0 && !fields) return '';
  return Papa.unparse(rows, fields ? { columns: fields } : undefined);
}

/** Build a NextResponse that downloads `csv` as a file. */
export function csvResponse(filename: string, csv: string, status = 200): Response {
  return new Response(csv, {
    status,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Serialize sale rows (with computed profit) to CSV. */
export function salesToCsv(
  sales: Array<Record<string, unknown>>,
): string {
  const fields = [
    'id', 'soldDate', 'itemId', 'itemName', 'soldPrice', 'platform',
    'shippingCost', 'shippingCollected', 'salesTax', 'platformFees',
    'refundAmount', 'refundType', 'purchasePrice', 'profit',
  ];
  return toCsv(sales, fields);
}

/** Serialize mileage rows to CSV. */
export function mileageToCsv(rows: Array<Record<string, unknown>>): string {
  const fields = ['id', 'date', 'miles', 'fromLocation', 'toLocation', 'address', 'vehicle', 'purpose'];
  return toCsv(rows, fields);
}