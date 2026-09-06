import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { importRequestSchema, csvRowLimit } from '@/lib/validations';
import {
  parseCsv, mapColumns, parsePrice, parseDateValue, normalizePlatform, normalizeRefundType,
  inventoryColumnMappings, salesColumnMappings, mileageColumnMappings,
} from '@/lib/csv-parser';
import { ApiErrors } from '@/lib/api-errors';

const BATCH_SIZE = 100;

/**
 * POST /api/import — CSV import for inventory, sales, or mileage.
 * All inserts run in a single transaction per import type.
 */
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const validation = importRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map((e) => e.message) },
      { status: 400 }
    );
  }

  const { type, csvData, columnMappings } = validation.data;
  const userId = sessionUserId(session);

  const { data: rows, errors: parseErrors } = parseCsv(csvData);
  if (rows.length > csvRowLimit) {
    throw ApiErrors.BadRequest(`CSV exceeds the ${csvRowLimit} row limit`);
  }
  if (rows.length === 0) {
    throw ApiErrors.BadRequest('CSV contains no data rows');
  }

  const errors = [...parseErrors];
  let success = 0;

  if (type === 'inventory') {
    const mappings = mapColumns(Object.keys(rows[0]), inventoryColumnMappings, columnMappings);
    if (!mappings.name) throw ApiErrors.BadRequest('Could not locate a "name" column in the CSV');

    db.transaction((tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row[mappings.name]?.trim();
        if (!name) {
          errors.push(`Row ${i + 1} skipped: missing item name`);
          continue;
        }

        const price = parsePrice(mappings.purchasePrice ? row[mappings.purchasePrice] : null);
        if (price === null || price < 0) {
          errors.push(`Row ${i + 1} skipped: invalid purchase price`);
          continue;
        }

        let purchaseDate = mappings.purchaseDate ? parseDateValue(row[mappings.purchaseDate]) : null;
        if (!purchaseDate) purchaseDate = new Date(); // estimate: today

        const now = new Date();
        try {
          tx.insert(items).values({
            name,
            description: mappings.description ? row[mappings.description] || null : null,
            purchaseDate,
            purchasePrice: price,
            purchaseLocation: mappings.purchaseLocation ? row[mappings.purchaseLocation] || null : null,
            category: mappings.category ? row[mappings.category] || null : null,
            notes: mappings.notes ? row[mappings.notes] || null : null,
            ownerId: userId,
            status: 'available',
            createdAt: now,
            updatedAt: now,
          }).run();
          success++;
        } catch (e) {
          errors.push(`Row ${i + 1} failed: ${(e as Error).message}`);
        }
      }
      return null;
    });
  } else if (type === 'sales') {
    const mappings = mapColumns(Object.keys(rows[0]), salesColumnMappings, columnMappings);
    if (!mappings.soldPrice) throw ApiErrors.BadRequest('Could not locate a sold price column in the CSV');
    if (!mappings.soldDate) throw ApiErrors.BadRequest('Could not locate a sold date column in the CSV');

    // Preload the user's items for lookup
    const userItems = await db.select().from(items).where(eq(items.ownerId, userId));
    const itemsById = new Map(userItems.map((it) => [it.id, it]));

    db.transaction((tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const soldPrice = parsePrice(mappings.soldPrice ? row[mappings.soldPrice] : null);
          const soldDate = parseDateValue(mappings.soldDate ? row[mappings.soldDate] : null);
          if (soldPrice === null || soldPrice < 0) {
            errors.push(`Row ${i + 1} skipped: invalid sold price`);
            continue;
          }
          if (!soldDate) {
            errors.push(`Row ${i + 1} skipped: invalid sold date`);
            continue;
          }

          // 1. Item lookup by ID
          let matchedItem = null;
          const itemIdRaw = mappings.itemId ? row[mappings.itemId] : null;
          const itemIdNum = itemIdRaw ? Number(itemIdRaw) : NaN;
          if (Number.isInteger(itemIdNum) && itemIdNum > 0) {
            matchedItem = itemsById.get(itemIdNum) ?? null;
          }

          // 2. Exact name match
          if (!matchedItem && mappings.itemName) {
            const name = row[mappings.itemName]?.trim();
            if (name) {
              matchedItem = userItems.find((it) => it.name === name) ?? null;
            }
          }

          // 3. Fuzzy match: name contains + purchaseDate within 1 day + price within $1
          if (!matchedItem && mappings.itemName) {
            const name = row[mappings.itemName]?.trim();
            if (name) {
              matchedItem = userItems.find((it) =>
                it.name.includes(name) &&
                Math.abs(it.purchaseDate.getTime() - soldDate.getTime()) <= 24 * 60 * 60 * 1000 &&
                Math.abs(it.purchasePrice - soldPrice) <= 1
              ) ?? null;
            }
          }

          // 4. No match → create a new item (status sold)
          let itemId: number | null = null;
          if (matchedItem) {
            itemId = matchedItem.id;
          } else if (mappings.itemName && row[mappings.itemName]?.trim()) {
            const now = new Date();
            const inserted = tx.insert(items).values({
              name: row[mappings.itemName].trim(),
              purchaseDate: soldDate,
              purchasePrice: 0,
              ownerId: userId,
              status: 'sold',
              removalDate: soldDate,
              createdAt: now,
              updatedAt: now,
            }).returning({ id: items.id }).all();
            itemId = inserted[0].id;
            itemsById.set(itemId, { id: itemId } as never);
          }

          const existingSale = itemId
            ? tx.select({ id: sales.id }).from(sales).where(eq(sales.itemId, itemId)).get()
            : null;

          const values = {
            itemId,
            soldDate,
            soldPrice,
            shippingCost: mappings.shippingCost ? parsePrice(row[mappings.shippingCost]) : null,
            shippingCollected: mappings.shippingCollected ? parsePrice(row[mappings.shippingCollected]) ?? 0 : 0,
            platform: normalizePlatform(mappings.platform ? row[mappings.platform] : null) as typeof sales.$inferInsert.platform,
            salesTax: mappings.salesTax ? parsePrice(row[mappings.salesTax]) : null,
            platformFees: mappings.platformFees ? parsePrice(row[mappings.platformFees]) ?? 0 : 0,
            refundAmount: mappings.refundAmount ? parsePrice(row[mappings.refundAmount]) ?? 0 : 0,
            refundReason: mappings.refundReason ? row[mappings.refundReason] || null : null,
            refundType: normalizeRefundType(mappings.refundType ? row[mappings.refundType] : null) as typeof sales.$inferInsert.refundType,
            soldBy: userId,
            createdAt: new Date(),
          };

          if (existingSale) {
            tx.update(sales).set(values).where(eq(sales.id, existingSale.id)).run();
          } else {
            tx.insert(sales).values(values).run();
          }

          // Mark matched items sold
          if (itemId && (!matchedItem || matchedItem.status !== 'sold')) {
            tx.update(items).set({ status: 'sold', removalDate: soldDate, updatedAt: new Date() }).where(eq(items.id, itemId)).run();
          }
          success++;
        } catch (e) {
          errors.push(`Row ${i + 1} failed: ${(e as Error).message}`);
        }
      }
      return null;
    });
  } else {
    // mileage
    const mappings = mapColumns(Object.keys(rows[0]), mileageColumnMappings, columnMappings);
    if (!mappings.date) throw ApiErrors.BadRequest('Could not locate a date column in the CSV');
    if (!mappings.miles) throw ApiErrors.BadRequest('Could not locate a miles column in the CSV');

    const batch: (typeof mileage.$inferInsert)[] = [];
    const now = new Date();

    db.transaction((tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const date = parseDateValue(mappings.date ? row[mappings.date] : null);
        const miles = parsePrice(mappings.miles ? row[mappings.miles] : null);
        if (!date) {
          errors.push(`Row ${i + 1} skipped: invalid date`);
          continue;
        }
        if (miles === null || miles <= 0) {
          errors.push(`Row ${i + 1} skipped: invalid miles`);
          continue;
        }

        batch.push({
          date,
          miles,
          fromLocation: mappings.fromLocation ? row[mappings.fromLocation] || null : null,
          toLocation: mappings.toLocation ? row[mappings.toLocation] || null : null,
          address: mappings.address ? row[mappings.address] || null : null,
          vehicle: mappings.vehicle ? row[mappings.vehicle] || null : null,
          purpose: mappings.purpose ? row[mappings.purpose] || null : null,
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        });

        if (batch.length >= BATCH_SIZE) {
          tx.insert(mileage).values(batch.splice(0, BATCH_SIZE)).run();
          success += BATCH_SIZE;
        }
      }

      if (batch.length > 0) {
        const count = batch.length;
        tx.insert(mileage).values(batch.splice(0)).run();
        success += count;
      }
      return null;
    });
  }

  return NextResponse.json({ success, errors });
});