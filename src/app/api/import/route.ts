import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { importSchema } from '@/lib/validations';
import { parseCSV, mapColumns, fuzzyMatchItem } from '@/lib/csv-parser';
import { isValidTransition } from '@/lib/constants';
import { eq } from 'drizzle-orm';

export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const validation = importSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: validation.error.issues.map(e => e.message) },
      { status: 400 }
    );
  }

  const { type, csvData, columnMappings } = validation.data;
  const parsed = parseCSV(csvData);

  if (parsed.data.length === 0) {
    return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });
  }
  if (parsed.data.length > 32000) {
    return NextResponse.json({ error: 'CSV data exceeds 32,000 row limit' }, { status: 400 });
  }

  const mapped = mapColumns(parsed.data, type, columnMappings);
  const userId = parseInt(session.user.id);
  let success = 0;
  const errors: string[] = [];

  try {
    if (type === 'inventory') {
      for (let i = 0; i < mapped.length; i++) {
        const row = mapped[i];
        if (!row.name) { errors.push(`Row ${i + 1}: missing item name`); continue; }
        try {
          await db.insert(items).values({
            name: row.name,
            description: row.description || null,
            purchaseDate: row.purchaseDate ? new Date(row.purchaseDate) : new Date(),
            purchasePrice: parseFloat(row.purchasePrice) || 0,
            purchaseLocation: row.purchaseLocation || null,
            category: row.category || null,
            status: (row.status as any) || 'available',
            notes: row.notes || null,
            ownerId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          success++;
        } catch (e: any) {
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }
    } else if (type === 'sales') {
      for (let i = 0; i < mapped.length; i++) {
        const row = mapped[i];
        if (!row.soldPrice) { errors.push(`Row ${i + 1}: missing sold price`); continue; }
        try {
          let itemId: number | null = null;
          if (row.itemId) {
            itemId = parseInt(row.itemId);
          } else if (row.itemName) {
            const matched = await db.query.items.findFirst({
              where: eq(items.name, row.itemName),
            });
            if (matched) itemId = matched.id;
          }

          await db.insert(sales).values({
            itemId,
            soldDate: row.soldDate ? new Date(row.soldDate) : new Date(),
            soldPrice: parseFloat(row.soldPrice),
            shippingCost: row.shippingCost ? parseFloat(row.shippingCost) : null,
            shippingCollected: row.shippingCollected ? parseFloat(row.shippingCollected) : 0,
            platform: (row.platform as any) || 'other',
            salesTax: row.salesTax ? parseFloat(row.salesTax) : null,
            platformFees: row.platformFees ? parseFloat(row.platformFees) : 0,
            soldBy: userId,
            createdAt: new Date(),
          });

          if (itemId) {
            await db.update(items).set({ status: 'sold', removalDate: new Date(), updatedAt: new Date() }).where(eq(items.id, itemId));
          }
          success++;
        } catch (e: any) {
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }
    } else if (type === 'mileage') {
      const batch: any[] = [];
      for (let i = 0; i < mapped.length; i++) {
        const row = mapped[i];
        if (!row.miles || isNaN(parseFloat(row.miles))) { errors.push(`Row ${i + 1}: missing or invalid miles`); continue; }
        batch.push({
          date: row.date ? new Date(row.date) : new Date(),
          miles: parseFloat(row.miles),
          fromLocation: row.fromLocation || null,
          toLocation: row.toLocation || null,
          address: row.address || null,
          vehicle: row.vehicle || null,
          purpose: row.purpose || null,
          ownerId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        if (batch.length >= 100) {
          await db.insert(mileage).values(batch);
          success += batch.length;
          batch.length = 0;
        }
      }
      if (batch.length > 0) {
        await db.insert(mileage).values(batch);
        success += batch.length;
      }
    }

    return NextResponse.json({ success, errors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});