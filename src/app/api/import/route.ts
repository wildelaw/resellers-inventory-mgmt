import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { importSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { eq, and } from 'drizzle-orm';
import { nowTimestamp, toTimestamp } from '@/lib/utils';
import { parseCsv, getInventoryColumnMap, getSalesColumnMap, getMileageColumnMap, normalizeStatus, normalizePlatform, fuzzyMatchItemName } from '@/lib/csv-parser';
import { getRawDb } from '@/lib/db';
import type { Session } from 'next-auth';

export const POST = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = importSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 },
    );
  }

  const { type, csvData } = validation.data;
  const parsed = parseCsv(csvData);

  if (parsed.data.length > 32000) {
    throw ApiErrors.BadRequest('CSV exceeds 32,000 row limit');
  }

  const userId = parseInt(session.user.id, 10);
  const errors: string[] = [];
  let success = 0;

  if (type === 'inventory') {
    const colMap = getInventoryColumnMap(parsed.headers);
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const name = colMap.name ? row[colMap.name] : undefined;
      if (!name) {
        errors.push(`Row ${i + 2} skipped: missing item name`);
        continue;
      }
      const now = nowTimestamp();
      const status = normalizeStatus(colMap.status ? row[colMap.status] : undefined) || 'available';
      try {
        await db.insert(items).values({
          name,
          description: colMap.notes ? row[colMap.notes] ?? null : null,
          purchaseDate: colMap.purchaseDate ? toTimestamp(row[colMap.purchaseDate]) : now,
          purchasePrice: colMap.purchasePrice ? Number(row[colMap.purchasePrice]) || 0 : 0,
          purchaseLocation: colMap.purchaseLocation ? row[colMap.purchaseLocation] ?? null : null,
          category: colMap.category ? row[colMap.category] ?? null : null,
          status,
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      } catch (e) {
        errors.push(`Row ${i + 2} skipped: ${(e as Error).message}`);
      }
    }
  } else if (type === 'sales') {
    const colMap = getSalesColumnMap(parsed.headers);
    const userItems = await db.select({ id: items.id, name: items.name }).from(items).where(eq(items.ownerId, userId));
    const sqlite = getRawDb();

    sqlite.transaction(() => {
      for (let i = 0; i < parsed.data.length; i++) {
        const row = parsed.data[i];
        const soldPrice = colMap.soldPrice ? Number(row[colMap.soldPrice]) : NaN;
        if (isNaN(soldPrice) || soldPrice < 0) {
          errors.push(`Row ${i + 2} skipped: invalid sold price`);
          continue;
        }

        // Resolve item
        let itemId: number | null = null;
        if (colMap.itemId && row[colMap.itemId]) {
          itemId = parseInt(row[colMap.itemId], 10);
          if (isNaN(itemId)) itemId = null;
        }
        if (!itemId && colMap.itemName && row[colMap.itemName]) {
          itemId = fuzzyMatchItemName(row[colMap.itemName], userItems);
          if (!itemId) {
            // Create new item
            const now = nowTimestamp();
            const result = sqlite.prepare(
              'INSERT INTO items (name, purchase_date, purchase_price, status, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ).run(row[colMap.itemName], now, 0, 'sold', userId, now, now);
            itemId = Number(result.lastInsertRowid);
            userItems.push({ id: itemId, name: row[colMap.itemName] });
          }
        }

        const now = nowTimestamp();
        const platform = normalizePlatform(colMap.platform ? row[colMap.platform] : undefined) || 'other';
        sqlite.prepare(
          'INSERT INTO sales (item_id, sold_date, sold_price, shipping_cost, shipping_collected, platform, sales_tax, platform_fees, refund_amount, refund_type, sold_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          itemId,
          colMap.soldDate ? toTimestamp(row[colMap.soldDate]) : now,
          soldPrice,
          colMap.shippingCost ? Number(row[colMap.shippingCost]) || null : null,
          colMap.shippingCollected ? Number(row[colMap.shippingCollected]) || 0 : 0,
          platform,
          colMap.salesTax ? Number(row[colMap.salesTax]) || null : null,
          colMap.platformFees ? Number(row[colMap.platformFees]) || 0 : 0,
          0,
          'none',
          userId,
          now,
        );

        if (itemId) {
          sqlite.prepare('UPDATE items SET status = ?, updated_at = ? WHERE id = ?').run('sold', now, itemId);
        }
        success++;
      }
    })();
  } else if (type === 'mileage') {
    const colMap = getMileageColumnMap(parsed.headers);
    const sqlite = getRawDb();
    const rows: unknown[][] = [];
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const miles = colMap.miles ? Number(row[colMap.miles]) : NaN;
      if (isNaN(miles) || miles < 0) {
        errors.push(`Row ${i + 2} skipped: invalid miles`);
        continue;
      }
      if (!colMap.date || !row[colMap.date]) {
        errors.push(`Row ${i + 2} skipped: missing date`);
        continue;
      }
      const now = nowTimestamp();
      rows.push([
        toTimestamp(row[colMap.date]),
        miles,
        colMap.fromLocation ? row[colMap.fromLocation] ?? null : null,
        colMap.toLocation ? row[colMap.toLocation] ?? null : null,
        colMap.address ? row[colMap.address] ?? null : null,
        colMap.vehicle ? row[colMap.vehicle] ?? null : null,
        colMap.purpose ? row[colMap.purpose] ?? null : null,
        userId,
        now,
        now,
      ]);
    }
    // Batch insert in chunks of 100
    const stmt = sqlite.prepare(
      'INSERT INTO mileage (date, miles, from_location, to_location, address, vehicle, purpose, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    sqlite.transaction(() => {
      for (const r of rows) {
        stmt.run(...r as never[]);
        success++;
      }
    })();
  }

  return NextResponse.json({ success, errors });
});