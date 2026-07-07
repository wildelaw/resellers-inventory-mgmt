import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { importSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { parseCSV, buildColumnMapping, mapRow, fuzzyMatchItem, inventoryColumnMappings, salesColumnMappings, mileageColumnMappings } from '@/lib/csv-parser';
import { nowTimestamp, toTimestamp } from '@/lib/utils';

// POST - Import CSV data
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    try {
      const body = await req.json();
      const validation = importSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
          { status: 400 }
        );
      }

      const { type, csvData, columnMappings } = validation.data;

      // Parse CSV
      const parsed = parseCSV(csvData);

      if (parsed.data.length > 32000) {
        throw ApiErrors.BadRequest('CSV exceeds maximum of 32,000 rows');
      }

      const userId = Number(session.user.id);
      const now = nowTimestamp();
      let success = 0;
      const errors: string[] = [];

      if (type === 'inventory') {
        const mapping = buildColumnMapping(parsed.headers, inventoryColumnMappings, columnMappings as Record<string, string>);

        for (let i = 0; i < parsed.data.length; i++) {
          const row = parsed.data[i];
          const mapped = mapRow(row, mapping);

          if (!mapped.name) {
            errors.push(`Row ${i + 2} skipped: missing item name`);
            continue;
          }

          try {
            await db.insert(items).values({
              name: String(mapped.name).slice(0, 200),
              description: mapped.description ? String(mapped.description).slice(0, 2000) : null,
              purchaseDate: mapped.purchaseDate ? toTimestamp(mapped.purchaseDate) : now,
              purchasePrice: mapped.purchasePrice ? Number(mapped.purchasePrice) : 0,
              purchaseLocation: mapped.purchaseLocation || null,
              category: mapped.category || null,
              status: (mapped.status as any) || 'available',
              ownerId: userId,
              createdAt: now,
              updatedAt: now,
            });
            success++;
          } catch (err) {
            errors.push(`Row ${i + 2} skipped: ${(err as Error).message}`);
          }
        }
      } else if (type === 'sales') {
        const mapping = buildColumnMapping(parsed.headers, salesColumnMappings, columnMappings as Record<string, string>);

        // Get user's items for matching
        const userItems = await db.query.items.findMany({
          where: eq(items.ownerId, userId),
        });

        for (let i = 0; i < parsed.data.length; i++) {
          const row = parsed.data[i];
          const mapped = mapRow(row, mapping);

          if (!mapped.soldPrice) {
            errors.push(`Row ${i + 2} skipped: missing sold price`);
            continue;
          }

          try {
            let itemId: number | null = null;

            // Try to find item
            if (mapped.itemId) {
              const id = Number(mapped.itemId);
              const found = userItems.find(it => it.id === id);
              if (found) itemId = found.id;
            }

            if (!itemId && mapped.itemName) {
              const match = fuzzyMatchItem(mapped.itemName, userItems);
              if (match) itemId = match.id;
            }

            // Create new item if no match
            if (!itemId && mapped.itemName) {
              const newItem = await db.insert(items).values({
                name: String(mapped.itemName).slice(0, 200),
                purchaseDate: mapped.purchaseDate ? toTimestamp(mapped.purchaseDate) : now,
                purchasePrice: 0,
                status: 'sold',
                ownerId: userId,
                createdAt: now,
                updatedAt: now,
              }).returning();
              itemId = newItem[0].id;
            }

            // Check for existing sale for this item
            if (itemId) {
              const existingSale = await db.query.sales.findFirst({
                where: eq(sales.itemId, itemId),
              });

              if (existingSale) {
                // Update existing sale
                await db.update(sales).set({
                  soldPrice: Number(mapped.soldPrice),
                  shippingCost: mapped.shippingCost ? Number(mapped.shippingCost) : null,
                  shippingCollected: Number(mapped.shippingCollected) || 0,
                  platform: (mapped.platform as any) || 'other',
                  salesTax: mapped.salesTax ? Number(mapped.salesTax) : null,
                  platformFees: Number(mapped.platformFees) || 0,
                }).where(eq(sales.id, existingSale.id));
                success++;
                continue;
              }
            }

            await db.insert(sales).values({
              itemId,
              soldDate: mapped.soldDate ? toTimestamp(mapped.soldDate) : now,
              soldPrice: Number(mapped.soldPrice),
              shippingCost: mapped.shippingCost ? Number(mapped.shippingCost) : null,
              shippingCollected: Number(mapped.shippingCollected) || 0,
              platform: (mapped.platform as any) || 'other',
              salesTax: mapped.salesTax ? Number(mapped.salesTax) : null,
              platformFees: Number(mapped.platformFees) || 0,
              refundAmount: 0,
              refundType: 'none',
              soldBy: userId,
              createdAt: now,
            });

            // Update item status to sold
            if (itemId) {
              await db.update(items).set({
                status: 'sold',
                removalDate: mapped.soldDate ? toTimestamp(mapped.soldDate) : now,
                updatedAt: now,
              }).where(eq(items.id, itemId));
            }

            success++;
          } catch (err) {
            errors.push(`Row ${i + 2} skipped: ${(err as Error).message}`);
          }
        }
      } else if (type === 'mileage') {
        const mapping = buildColumnMapping(parsed.headers, mileageColumnMappings, columnMappings as Record<string, string>);

        // Batch inserts in chunks of 100
        const batchSize = 100;
        for (let i = 0; i < parsed.data.length; i++) {
          const row = parsed.data[i];
          const mapped = mapRow(row, mapping);

          if (!mapped.date || !mapped.miles) {
            errors.push(`Row ${i + 2} skipped: missing date or miles`);
            continue;
          }

          try {
            await db.insert(mileage).values({
              date: toTimestamp(mapped.date),
              miles: Number(mapped.miles),
              fromLocation: mapped.fromLocation || null,
              toLocation: mapped.toLocation || null,
              address: mapped.address || null,
              vehicle: mapped.vehicle || null,
              purpose: mapped.purpose || null,
              ownerId: userId,
              createdAt: now,
              updatedAt: now,
            });
            success++;
          } catch (err) {
            errors.push(`Row ${i + 2} skipped: ${(err as Error).message}`);
          }
        }
      }

      return NextResponse.json({ success, errors });
    } catch (error) {
      return handleApiError(error);
    }
  })(req, { params: Promise.resolve({}) });
}