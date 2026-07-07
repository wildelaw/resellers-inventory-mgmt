import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, getSqlite } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { importSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';
import {
  parseCsv,
  resolveColumnMapping,
  getField,
  inventoryColumnMappings,
  salesColumnMappings,
  mileageColumnMappings,
  fuzzyMatchItem,
} from '@/lib/csv-parser';

const MAX_ROWS = 32000;

export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const { type, csvData, columnMappings } = parsed.data;
    const uid = sessionUserId(session);

    if (csvData.length > 1_000_000) throw ApiErrors.BadRequest('CSV data exceeds 1MB limit');

    const { headers, rows, errors: parseErrors } = parseCsv(csvData);
    if (rows.length === 0) return NextResponse.json({ success: 0, errors: ['No data rows found'] });
    if (rows.length > MAX_ROWS) throw ApiErrors.BadRequest(`CSV exceeds ${MAX_ROWS} row limit`);

    const errors: string[] = [...parseErrors];
    let success = 0;
    const now = Math.floor(Date.now() / 1000);
    const sqlite = getSqlite();

    if (type === 'inventory') {
      const mapping = resolveColumnMapping(headers, inventoryColumnMappings, columnMappings);
      sqlite.transaction(() => {
        rows.forEach((row, idx) => {
          const name = getField(row, mapping, 'name');
          if (!name) { errors.push(`Row ${idx + 2} skipped: missing item name`); return; }
          const purchaseDateRaw = getField(row, mapping, 'purchaseDate');
          const purchaseDate = purchaseDateRaw ? Math.floor(new Date(purchaseDateRaw).getTime() / 1000) : now;
          const purchasePriceRaw = getField(row, mapping, 'purchasePrice');
          const purchasePrice = purchasePriceRaw ? parseFloat(purchasePriceRaw) : 0;
          const purchaseLocation = getField(row, mapping, 'purchaseLocation');
          const category = getField(row, mapping, 'category');
          const notes = getField(row, mapping, 'notes');

          db.insert(items).values({
            name,
            purchaseDate: isNaN(purchaseDate) ? now : purchaseDate,
            purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
            purchaseLocation: purchaseLocation ?? null,
            category: category ?? null,
            notes: notes ?? null,
            ownerId: uid,
            status: 'available',
            createdAt: now,
            updatedAt: now,
          }).run();
          success++;
        });
      })();
    } else if (type === 'sales') {
      const mapping = resolveColumnMapping(headers, salesColumnMappings, columnMappings);
      // Fetch user's items for fuzzy matching.
      const userItems = await db.query.items.findMany({ where: eq(items.ownerId, uid) });
      sqlite.transaction(() => {
        rows.forEach((row, idx) => {
          const soldPriceRaw = getField(row, mapping, 'soldPrice');
          if (!soldPriceRaw) { errors.push(`Row ${idx + 2} skipped: missing sold price`); return; }
          const soldPrice = parseFloat(soldPriceRaw);
          if (isNaN(soldPrice)) { errors.push(`Row ${idx + 2} skipped: invalid sold price`); return; }

          const soldDateRaw = getField(row, mapping, 'soldDate');
          const soldDate = soldDateRaw ? Math.floor(new Date(soldDateRaw).getTime() / 1000) : now;
          const platform = (getField(row, mapping, 'platform') ?? 'other') as typeof sales.platform.enumValues;
          const shippingCost = getField(row, mapping, 'shippingCost') ? parseFloat(getField(row, mapping, 'shippingCost')!) : null;
          const shippingCollected = getField(row, mapping, 'shippingCollected') ? parseFloat(getField(row, mapping, 'shippingCollected')!) : 0;
          const salesTax = getField(row, mapping, 'salesTax') ? parseFloat(getField(row, mapping, 'salesTax')!) : null;
          const platformFees = getField(row, mapping, 'platformFees') ? parseFloat(getField(row, mapping, 'platformFees')!) : 0;

          // Item lookup: by ID, then exact name, then fuzzy.
          let itemId: number | null = null;
          const itemIdRaw = getField(row, mapping, 'itemId');
          const itemName = getField(row, mapping, 'itemName');
          if (itemIdRaw) {
            const id = parseInt(itemIdRaw, 10);
            const found = userItems.find((i) => i.id === id);
            if (found) itemId = found.id;
          }
          if (itemId === null && itemName) {
            itemId = fuzzyMatchItem(userItems, itemName);
          }
          if (itemId === null && itemName) {
            // Create new item with status 'sold'.
            const newItem = db.insert(items).values({
              name: itemName,
              purchaseDate: soldDate,
              purchasePrice: 0,
              ownerId: uid,
              status: 'sold',
              removalDate: soldDate,
              createdAt: now,
              updatedAt: now,
            }).returning();
            itemId = newItem[0].id;
          }

          db.insert(sales).values({
            itemId: itemId ?? null,
            soldDate: isNaN(soldDate) ? now : soldDate,
            soldPrice,
            shippingCost: shippingCost && !isNaN(shippingCost) ? shippingCost : null,
            shippingCollected: shippingCollected && !isNaN(shippingCollected) ? shippingCollected : 0,
            platform: (Object.keys({ local: 1, facebook: 1, instagram: 1, ebay: 1, poshmark: 1, mercari: 1, consignment: 1, other: 1 }).includes(platform) ? platform : 'other') as typeof sales.platform.enumValues,
            salesTax: salesTax && !isNaN(salesTax) ? salesTax : null,
            platformFees: platformFees && !isNaN(platformFees) ? platformFees : 0,
            refundAmount: 0,
            refundType: 'none',
            soldBy: uid,
            createdAt: now,
          }).run();

          // Update linked item status to sold.
          if (itemId) {
            db.update(items).set({ status: 'sold', removalDate: soldDate, updatedAt: now }).where(eq(items.id, itemId)).run();
          }
          success++;
        });
      })();
    } else if (type === 'mileage') {
      const mapping = resolveColumnMapping(headers, mileageColumnMappings, columnMappings);
      sqlite.transaction(() => {
        const batch: typeof mileage.$inferInsert[] = [];
        rows.forEach((row, idx) => {
          const dateRaw = getField(row, mapping, 'date');
          const milesRaw = getField(row, mapping, 'miles');
          if (!dateRaw || !milesRaw) { errors.push(`Row ${idx + 2} skipped: missing date or miles`); return; }
          const date = Math.floor(new Date(dateRaw).getTime() / 1000);
          const miles = parseFloat(milesRaw);
          if (isNaN(date) || isNaN(miles)) { errors.push(`Row ${idx + 2} skipped: invalid date or miles`); return; }
          batch.push({
            date,
            miles,
            fromLocation: getField(row, mapping, 'fromLocation') ?? null,
            toLocation: getField(row, mapping, 'toLocation') ?? null,
            address: getField(row, mapping, 'address') ?? null,
            vehicle: getField(row, mapping, 'vehicle') ?? null,
            purpose: getField(row, mapping, 'purpose') ?? null,
            ownerId: uid,
            createdAt: now,
            updatedAt: now,
          });
          // Batch insert in chunks of 100.
          if (batch.length === 100) {
            db.insert(mileage).values(batch).run();
            success += batch.length;
            batch.length = 0;
          }
        });
        if (batch.length > 0) {
          db.insert(mileage).values(batch).run();
          success += batch.length;
        }
      })();
    }

    return NextResponse.json({ success, errors });
  })(req, { params: Promise.resolve({}) });
}
