import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { importSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { parseInventoryCsv, parseSalesCsv, parseMileageCsv } from '@/lib/csv-parser';
import type { NewItem, NewSale, NewMileageEntry } from '@/lib/schema';

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = importSchema.parse(body);

  const { type, csvData, columnMappings } = parsed;
  const userId = Number(session.user.id);

  let success = 0;
  const errors: string[] = [];

  if (type === 'inventory') {
    const { data, errors: parseErrors } = parseInventoryCsv(csvData, columnMappings);
    errors.push(...parseErrors);

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as Record<string, unknown>;
        await db.insert(items).values({
          name: String(row.name ?? ''),
          purchaseDate: Number(row.purchaseDate) || Math.floor(Date.now() / 1000),
          purchasePrice: Number(row.purchasePrice) || 0,
          purchaseLocation: row.purchaseLocation ? String(row.purchaseLocation) : null,
          category: row.category ? String(row.category) : null,
          notes: row.notes ? String(row.notes) : null,
          status: 'available',
          ownerId: userId,
        } as NewItem).execute();
        success++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Failed to insert'}`);
      }
    }
  } else if (type === 'sales') {
    const { data, errors: parseErrors } = parseSalesCsv(csvData, columnMappings);
    errors.push(...parseErrors);

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as Record<string, unknown>;
        await db.insert(sales).values({
          itemId: row.itemId ? Number(row.itemId) : null,
          soldDate: Number(row.soldDate) || Math.floor(Date.now() / 1000),
          soldPrice: Number(row.soldPrice) || 0,
          shippingCost: row.shippingCost ? Number(row.shippingCost) : null,
          shippingCollected: row.shippingCollected ? Number(row.shippingCollected) : null,
          platform: String(row.platform || 'other'),
          salesTax: row.salesTax ? Number(row.salesTax) : null,
          platformFees: row.platformFees ? Number(row.platformFees) : null,
          soldBy: userId,
        } as NewSale).execute();
        success++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Failed to insert'}`);
      }
    }
  } else if (type === 'mileage') {
    const { data, errors: parseErrors } = parseMileageCsv(csvData, columnMappings);
    errors.push(...parseErrors);

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as Record<string, unknown>;
        await db.insert(mileage).values({
          date: Number(row.date) || Math.floor(Date.now() / 1000),
          miles: Number(row.miles) || 0,
          fromLocation: row.fromLocation ? String(row.fromLocation) : null,
          toLocation: row.toLocation ? String(row.toLocation) : null,
          address: row.address ? String(row.address) : null,
          vehicle: row.vehicle ? String(row.vehicle) : null,
          purpose: row.purpose ? String(row.purpose) : null,
          ownerId: userId,
        } as NewMileageEntry).execute();
        success++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Failed to insert'}`);
      }
    }
  } else {
    throw ApiErrors.BadRequest(`Invalid import type: ${type}`);
  }

  return NextResponse.json({ success, errors });
});