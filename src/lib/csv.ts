import Papa from 'papaparse';
import type { Sale } from './schema';

export interface SaleExportRow {
  id: number;
  itemId: number | null;
  soldDate: string;
  soldPrice: number;
  shippingCost: number | null;
  shippingCollected: number | null;
  platform: string;
  salesTax: number | null;
  platformFees: number | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundType: string;
  soldBy: number;
  createdAt: string;
}

function ts(v: number): string {
  return new Date(v).toISOString();
}

export function salesToCsv(sales: Sale[]): string {
  const rows: SaleExportRow[] = sales.map((s) => ({
    id: s.id,
    itemId: s.itemId ?? null,
    soldDate: ts(s.soldDate),
    soldPrice: s.soldPrice,
    shippingCost: s.shippingCost ?? null,
    shippingCollected: s.shippingCollected ?? null,
    platform: s.platform,
    salesTax: s.salesTax ?? null,
    platformFees: s.platformFees ?? null,
    refundAmount: s.refundAmount ?? null,
    refundReason: s.refundReason ?? null,
    refundType: s.refundType,
    soldBy: s.soldBy,
    createdAt: ts(s.createdAt),
  }));
  return Papa.unparse(rows);
}

export function mileageToCsv(rows: Array<{
  id: number; date: number; miles: number; fromLocation: string | null;
  toLocation: string | null; address: string | null; vehicle: string | null;
  purpose: string | null; ownerId: number; createdAt: number; updatedAt: number;
}>): string {
  const out = rows.map((r) => ({
    id: r.id,
    date: ts(r.date),
    miles: r.miles,
    fromLocation: r.fromLocation ?? '',
    toLocation: r.toLocation ?? '',
    address: r.address ?? '',
    vehicle: r.vehicle ?? '',
    purpose: r.purpose ?? '',
    ownerId: r.ownerId,
    createdAt: ts(r.createdAt),
    updatedAt: ts(r.updatedAt),
  }));
  return Papa.unparse(out);
}