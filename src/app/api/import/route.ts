import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, getRawDb } from '@/lib/db';
import { items, sales, mileage, nowTs } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { importSchema } from '@/lib/validations';
import {
  parseCsv, mapColumns, INVENTORY_COLUMN_ALIASES, SALES_COLUMN_ALIASES, MILEAGE_COLUMN_ALIASES,
  fuzzyMatchScore,
} from '@/lib/csv-parser';
import { computeStatusUpdate } from '@/lib/inventory-logic';
import { ApiErrors } from '@/lib/api-errors';
import { PLATFORMS } from '@/lib/constants';
import type { ItemStatus, Platform } from '@/lib/constants';

const MAX_ROWS = 32000;

export const POST = withAuth(async (req, _ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', details: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    );
  }
  const { type, csvData, columnMappings } = parsed.data;
  const uid = currentUserId(session);

  const rows = parseCsv(csvData);
  if (rows.length > MAX_ROWS) {
    throw ApiErrors.BadRequest(`CSV exceeds ${MAX_ROWS} row limit`);
  }

  const errors: string[] = [];
  let success = 0;

  if (type === 'inventory') {
    const headers = Object.keys(rows[0] ?? {});
    const mapping = mapColumns(headers, INVENTORY_COLUMN_ALIASES, columnMappings);
    const sqlite = getRawDb();
    const tx = sqlite.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = (mapping.name ? row[mapping.name] : '') || '';
        if (!name) { errors.push(`Row ${i + 2} skipped: missing item name`); continue; }
        const purchasePrice = parseFloat((mapping.purchasePrice ? row[mapping.purchasePrice] : '') || '0') || 0;
        const dateStr = mapping.purchaseDate ? row[mapping.purchaseDate] : '';
        const purchaseDate = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : nowTs();
        const ts = nowTs();
        db.insert(items).values({
          name,
          description: (mapping.description ? row[mapping.description] : '') || null,
          purchaseDate: Number.isFinite(purchaseDate) ? purchaseDate : nowTs(),
          purchasePrice,
          purchaseLocation: (mapping.purchaseLocation ? row[mapping.purchaseLocation] : '') || null,
          category: (mapping.category ? row[mapping.category] : '') || null,
          status: 'available',
          notes: (mapping.notes ? row[mapping.notes] : '') || null,
          ownerId: uid,
          createdAt: ts,
          updatedAt: ts,
        }).run();
        success++;
      }
    });
    tx();
  } else if (type === 'sales') {
    const headers = Object.keys(rows[0] ?? {});
    const mapping = mapColumns(headers, SALES_COLUMN_ALIASES, columnMappings);
    // Preload this user's items for fuzzy matching.
    const userItems = db.select().from(items).where(eq(items.ownerId, uid)).all();
    const sqlite = getRawDb();
    const tx = sqlite.transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const idStr = mapping.itemId ? row[mapping.itemId] : '';
        const nameStr = (mapping.itemName ? row[mapping.itemName] : '') || '';
        const soldPrice = parseFloat((mapping.soldPrice ? row[mapping.soldPrice] : '') || '0') || 0;
        if (!soldPrice && !nameStr) { errors.push(`Row ${i + 2} skipped: missing price and item name`); continue; }

        // Resolve item
        let item = userItems.find((it) => String(it.id) === idStr?.trim());
        if (!item && nameStr) {
          item = userItems.find((it) => it.name.toLowerCase() === nameStr.toLowerCase());
          if (!item) {
            // fuzzy
            let best = userItems[0];
            let bestScore = -1;
            for (const it of userItems) {
              const score = fuzzyMatchScore(
                { name: nameStr },
                { name: it.name, purchaseDate: it.purchaseDate, purchasePrice: it.purchasePrice },
              );
              if (score > bestScore) { bestScore = score; best = it; }
            }
            item = bestScore >= 80 ? best : undefined;
          }
        }
        const ts = nowTs();
        let itemId = 0;
        if (!item) {
          // create new item (status sold)
          const [created] = db.insert(items).values({
            name: nameStr || `Imported ${i + 2}`,
            purchaseDate: ts,
            purchasePrice: 0,
            status: 'sold',
            ownerId: uid,
            createdAt: ts,
            updatedAt: ts,
          }).returning().all();
          itemId = created.id;
        } else {
          itemId = item.id;
          // update item status to sold if not already
          if (item.status !== 'sold') {
            const res = computeStatusUpdate(item.status as ItemStatus, 'sold', item.removalDate);
            db.update(items).set({ status: 'sold', removalDate: res.removalDate, updatedAt: ts })
              .where(eq(items.id, item.id)).run();
          }
        }

        const dateStr = mapping.soldDate ? row[mapping.soldDate] : '';
        const soldDate = dateStr ? Math.floor(new Date(dateStr).getTime() / 1000) : ts;
        const platformRaw = (mapping.platform ? row[mapping.platform] : '') || 'other';
        const platform: Platform = (PLATFORMS.includes(platformRaw as Platform) ? platformRaw : 'other') as Platform;
        // skip if an existing sale for this item exists (update instead)
        const existing = db.select().from(sales).where(eq(sales.itemId, itemId)).all()[0];
        if (existing) {
          db.update(sales).set({ soldPrice, soldDate }).where(eq(sales.id, existing.id)).run();
        } else {
          db.insert(sales).values({
            itemId,
            soldDate,
            soldPrice,
            shippingCost: parseFloat((mapping.shippingCost ? row[mapping.shippingCost] : '') || '0') || null,
            shippingCollected: parseFloat((mapping.shippingCollected ? row[mapping.shippingCollected] : '') || '0') || 0,
            platform,
            platformFees: parseFloat((mapping.platformFees ? row[mapping.platformFees] : '') || '0') || 0,
            refundAmount: 0,
            refundType: 'none',
            soldBy: uid,
            createdAt: ts,
          }).run();
        }
        success++;
      }
    });
    tx();
  } else if (type === 'mileage') {
    const headers = Object.keys(rows[0] ?? {});
    const mapping = mapColumns(headers, MILEAGE_COLUMN_ALIASES, columnMappings);
    const sqlite = getRawDb();
    const ts = nowTs();
    const tx = sqlite.transaction(() => {
      const batch: Array<typeof mileage.$inferInsert> = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const dateStr = mapping.date ? row[mapping.date] : '';
        const miles = parseFloat((mapping.miles ? row[mapping.miles] : '') || '0') || 0;
        if (!dateStr || !miles) { errors.push(`Row ${i + 2} skipped: missing date or miles`); continue; }
        const date = Math.floor(new Date(dateStr).getTime() / 1000);
        batch.push({
          date,
          miles,
          fromLocation: (mapping.fromLocation ? row[mapping.fromLocation] : '') || null,
          toLocation: (mapping.toLocation ? row[mapping.toLocation] : '') || null,
          address: (mapping.address ? row[mapping.address] : '') || null,
          vehicle: (mapping.vehicle ? row[mapping.vehicle] : '') || null,
          purpose: (mapping.purpose ? row[mapping.purpose] : '') || null,
          ownerId: uid,
          createdAt: ts,
          updatedAt: ts,
        });
        if (batch.length === 100) {
          db.insert(mileage).values(batch).run();
          success += batch.length;
          batch.length = 0;
        }
      }
      if (batch.length) { db.insert(mileage).values(batch).run(); success += batch.length; }
    });
    tx();
  }

  return NextResponse.json({ success, errors });
});