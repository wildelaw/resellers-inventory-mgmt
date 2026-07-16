import Papa from "papaparse";
import type { Sale, Item } from "./schema";

export function salesToCsv(
  sales: Array<Sale & { item: Item | null; seller: { name: string } | null }>
): string {
  const rows = sales.map((s) => ({
    id: s.id,
    soldDate: s.soldDate
      ? new Date(s.soldDate * 1000).toISOString().slice(0, 10)
      : "",
    itemName: s.item?.name ?? "",
    soldPrice: s.soldPrice,
    shippingCost: s.shippingCost ?? 0,
    shippingCollected: s.shippingCollected ?? 0,
    platform: s.platform,
    salesTax: s.salesTax ?? 0,
    platformFees: s.platformFees ?? 0,
    refundAmount: s.refundAmount ?? 0,
    refundType: s.refundType,
    refundReason: s.refundReason ?? "",
    soldBy: s.seller?.name ?? "",
  }));

  return Papa.unparse(rows);
}

export function mileageToCsv(
  records: Array<{
    id: number;
    date: number;
    miles: number;
    fromLocation: string | null;
    toLocation: string | null;
    address: string | null;
    vehicle: string | null;
    purpose: string | null;
  }>
): string {
  const rows = records.map((r) => ({
    id: r.id,
    date: new Date(r.date * 1000).toISOString().slice(0, 10),
    miles: r.miles,
    fromLocation: r.fromLocation ?? "",
    toLocation: r.toLocation ?? "",
    address: r.address ?? "",
    vehicle: r.vehicle ?? "",
    purpose: r.purpose ?? "",
  }));
  return Papa.unparse(rows);
}
