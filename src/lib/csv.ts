import Papa from 'papaparse';
import { PLATFORM_LABELS } from './constants';
import type { Sale } from './schema';

interface SaleWithItem extends Sale {
  itemName?: string | null;
  purchasePrice?: number | null;
}

/**
 * Convert a list of sales (joined with their item) into CSV for export.
 */
export function salesToCsv(rows: SaleWithItem[]): string {
  const data = rows.map((r) => ({
    'Sale ID': r.id,
    'Item ID': r.itemId ?? '',
    'Item Name': r.itemName ?? '',
    'Sold Date': new Date(r.soldDate * 1000).toISOString().slice(0, 10),
    'Sold Price': r.soldPrice.toFixed(2),
    'Shipping Cost': (r.shippingCost ?? 0).toFixed(2),
    'Shipping Collected': (r.shippingCollected ?? 0).toFixed(2),
    Platform: PLATFORM_LABELS[r.platform] ?? r.platform,
    'Sales Tax': (r.salesTax ?? 0).toFixed(2),
    'Platform Fees': (r.platformFees ?? 0).toFixed(2),
    'Refund Amount': (r.refundAmount ?? 0).toFixed(2),
    'Refund Reason': r.refundReason ?? '',
    'Refund Type': r.refundType,
    'Sold By': r.soldBy,
  }));
  return Papa.unparse(data);
}

interface MileageRow {
  id: number;
  date: number;
  miles: number;
  fromLocation: string | null;
  toLocation: string | null;
  address: string | null;
  vehicle: string | null;
  purpose: string | null;
  ownerId: number;
}

export function mileageToCsv(rows: MileageRow[]): string {
  const data = rows.map((r) => ({
    ID: r.id,
    Date: new Date(r.date * 1000).toISOString().slice(0, 10),
    Miles: r.miles,
    'From Location': r.fromLocation ?? '',
    'To Location': r.toLocation ?? '',
    Address: r.address ?? '',
    Vehicle: r.vehicle ?? '',
    Purpose: r.purpose ?? '',
  }));
  return Papa.unparse(data);
}
