import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { importSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { parseCsv, mapColumns, normalizeRow, fuzzyMatchScore } from '@/lib/csv-parser';
import { toTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const MAX_ROWS = 32_000;

// POST /api/import — CSV import (inventory | sales | mileage)
export async function POST(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return ApiErrors.BadRequest('Validation failed', parsed.error.issues.map((i) => i.message)).toResponse();
    }
    const { type, csvData, columnMappings } = parsed.data;

    const { headers, rows } = parseCsv(csvData);
    if (rows.length > MAX_ROWS) {
      return ApiErrors.BadRequest(`Too many rows (max ${MAX_ROWS})`).toResponse();
    }
    if (rows.length === 0) {
      return NextResponse.json({ success: 0, errors: ['No rows found'] });
    }

    const colMap = mapColumns(headers, columnMappings);
    const uid = Number(session.user.id);
    const errors: string[] = [];
    let success = 0;

    if (type === 'inventory') {
      if (!colMap.name) {
        return ApiErrors.BadRequest('Could not find a "name" column').toResponse();
      }
      const now = Date.now();
      const toInsert: Array<typeof items.$inferInsert> = [];
      for (let i = 0; i < rows.length; i++) {
        const norm = normalizeRow(rows[i], colMap);
        const name = (norm.name ?? '').trim();
        if (!name) {
          errors.push(`Row ${i + 1} skipped: missing item name`);
          continue;
        }
        const purchaseTs = toTimestamp(norm.purchaseDate ?? null) ?? now;
        const purchasePrice = Number(norm.purchasePrice ?? 0);
        toInsert.push({
          name,
          description: norm.notes ?? null,
          purchaseDate: purchaseTs,
          purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
          purchaseLocation: norm.purchaseLocation ?? null,
          category: norm.category ?? null,
          status: 'available',
          notes: norm.notes ?? null,
          ownerId: uid,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      }
      // Insert in chunks of 100
      for (let i = 0; i < toInsert.length; i += 100) {
        db.insert(items).values(toInsert.slice(i, i + 100)).run();
      }
    } else if (type === 'sales') {
      if (!colMap.soldDate && !colMap.date) {
        return ApiErrors.BadRequest('Could not find a "sold date" column').toResponse();
      }
      if (!colMap.soldPrice) {
        return ApiErrors.BadRequest('Could not find a "sold price" column').toResponse();
      }
      const now = Date.now();
      const userItems = db.select().from(items).where(eq(items.ownerId, uid)).all();

      db.transaction((tx) => {
        for (let i = 0; i < rows.length; i++) {
          const norm = normalizeRow(rows[i], colMap);
          const soldPrice = Number(norm.soldPrice ?? 0);
          if (!Number.isFinite(soldPrice) || soldPrice < 0) {
            errors.push(`Row ${i + 1} skipped: invalid soldPrice`);
            continue;
          }
          const soldTs = toTimestamp(norm.soldDate ?? norm.date ?? null) ?? now;
          // Lookup item
          let matchedItem: typeof items.$inferSelect | null = null;
          if (norm.itemId) {
            const id = Number(norm.itemId);
            matchedItem = userItems.find((it) => it.id === id) ?? null;
          }
          if (!matchedItem && norm.itemName) {
            const name = norm.itemName.trim().toLowerCase();
            matchedItem = userItems.find((it) => it.name.toLowerCase() === name) ?? null;
          }
          if (!matchedItem && norm.itemName) {
            // Fuzzy
            const target = { name: norm.itemName, purchasePrice: null, purchaseDate: null };
            let bestScore = 0;
            let best: typeof items.$inferSelect | null = null;
            for (const it of userItems) {
              const score = fuzzyMatchScore(
                { name: it.name, purchasePrice: it.purchasePrice, purchaseDate: it.purchaseDate },
                target,
              );
              if (score > bestScore) {
                bestScore = score;
                best = it;
              }
            }
            if (bestScore >= 30) matchedItem = best;
          }
          if (!matchedItem) {
            // Create new item
            const created = tx
              .insert(items)
              .values({
                name: norm.itemName || norm.name || `Imported sale ${i + 1}`,
                purchaseDate: soldTs,
                purchasePrice: Number(norm.purchasePrice ?? 0) || 0,
                status: 'sold',
                removalDate: soldTs,
                ownerId: uid,
                createdAt: now,
                updatedAt: now,
              })
              .returning()
              .get();
            matchedItem = created;
          } else if (matchedItem.status !== 'sold') {
            tx.update(items)
              .set({ status: 'sold', removalDate: soldTs, updatedAt: now })
              .where(eq(items.id, matchedItem.id))
              .run();
          }

          tx.insert(sales)
            .values({
              itemId: matchedItem.id,
              soldDate: soldTs,
              soldPrice,
              shippingCost: norm.shippingCost ? Number(norm.shippingCost) : null,
              shippingCollected: norm.shippingCollected ? Number(norm.shippingCollected) : 0,
              platform: (norm.platform as any) || 'other',
              salesTax: norm.salesTax ? Number(norm.salesTax) : null,
              platformFees: norm.platformFees ? Number(norm.platformFees) : 0,
              refundAmount: 0,
              refundType: 'none',
              soldBy: uid,
              createdAt: now,
            })
            .run();
          success++;
        }
      });
    } else if (type === 'mileage') {
      if (!colMap.date && !colMap.soldDate) {
        return ApiErrors.BadRequest('Could not find a "date" column').toResponse();
      }
      if (!colMap.miles) {
        return ApiErrors.BadRequest('Could not find a "miles" column').toResponse();
      }
      const now = Date.now();
      const toInsert: Array<typeof mileage.$inferInsert> = [];
      for (let i = 0; i < rows.length; i++) {
        const norm = normalizeRow(rows[i], colMap);
        const miles = Number(norm.miles);
        if (!Number.isFinite(miles) || miles < 0) {
          errors.push(`Row ${i + 1} skipped: invalid miles`);
          continue;
        }
        const ts = toTimestamp(norm.date ?? norm.soldDate ?? null) ?? now;
        toInsert.push({
          date: ts,
          miles,
          fromLocation: norm.fromLocation ?? null,
          toLocation: norm.toLocation ?? null,
          address: norm.address ?? null,
          vehicle: norm.vehicle ?? null,
          purpose: norm.purpose ?? null,
          ownerId: uid,
          createdAt: now,
          updatedAt: now,
        });
        success++;
      }
      for (let i = 0; i < toInsert.length; i += 100) {
        db.insert(mileage).values(toInsert.slice(i, i + 100)).run();
      }
    } else {
      return ApiErrors.BadRequest('Invalid import type').toResponse();
    }

    return NextResponse.json({ success, errors });
  })(req, { params: Promise.resolve({}) });
}