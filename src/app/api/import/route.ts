import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales, mileage } from '@/lib/schema';
import { importSchema } from '@/lib/validations';
import { parseCsv, autoMapColumns, applyMappings, validateRequiredFields } from '@/lib/csv-parser';
import { ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const body = await req.json();
    const validation = importSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const { type, csvData, columnMappings } = validation.data;
    const parsed = parseCsv(csvData);
    if (parsed.totalRows === 0) return NextResponse.json({ error: 'No data found in CSV' }, { status: 400 });
    const headers = Object.keys(parsed.data[0]);
    const mappings = columnMappings || autoMapColumns(headers, type as 'inventory' | 'sales' | 'mileage');
    const mappedData = applyMappings(parsed.data, mappings as Record<string, string>);
    const required = type === 'inventory' ? ['name'] : type === 'sales' ? ['soldDate', 'soldPrice', 'platform'] : ['date', 'miles'];
    const fieldValidation = validateRequiredFields(mappedData, required);
    if (!fieldValidation.valid) return NextResponse.json({ error: 'Missing required fields', details: fieldValidation.errors.slice(0, 10) }, { status: 400 });
    let successCount = 0;
    const errors: string[] = [];
    const now = Math.floor(Date.now() / 1000);
    try {
      if (type === 'inventory') {
        for (let i = 0; i < mappedData.length; i++) {
          try {
            const row = mappedData[i];
            await db.insert(items).values({ name: String(row.name || ''), description: row.description ? String(row.description) : null, purchaseDate: Number(row.purchaseDate) || now, purchasePrice: Number(row.purchasePrice) || 0, purchaseLocation: row.purchaseLocation ? String(row.purchaseLocation) : null, category: row.category ? String(row.category) : null, status: 'available', notes: row.notes ? String(row.notes) : null, ownerId: session.user.id, createdAt: now, updatedAt: now });
            successCount++;
          } catch (err) { errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`); }
        }
      } else if (type === 'sales') {
        for (let i = 0; i < mappedData.length; i++) {
          try {
            const row = mappedData[i];
            await db.insert(sales).values({ itemId: row.itemId ? Number(row.itemId) : null, soldDate: Number(row.soldDate) || now, soldPrice: Number(row.soldPrice) || 0, shippingCost: row.shippingCost ? Number(row.shippingCost) : null, shippingCollected: row.shippingCollected ? Number(row.shippingCollected) : 0, platform: String(row.platform || 'other') as any, salesTax: row.salesTax ? Number(row.salesTax) : null, platformFees: row.platformFees ? Number(row.platformFees) : 0, soldBy: session.user.id, createdAt: now });
            successCount++;
          } catch (err) { errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`); }
        }
      } else if (type === 'mileage') {
        const chunkSize = 100;
        for (let i = 0; i < mappedData.length; i += chunkSize) {
          const chunk = mappedData.slice(i, i + chunkSize);
          try {
            await db.insert(mileage).values(chunk.map(row => ({ date: Number(row.date) || now, miles: Number(row.miles) || 0, fromLocation: row.fromLocation ? String(row.fromLocation) : null, toLocation: row.toLocation ? String(row.toLocation) : null, address: row.address ? String(row.address) : null, vehicle: row.vehicle ? String(row.vehicle) : null, purpose: row.purpose ? String(row.purpose) : null, ownerId: session.user.id, createdAt: now, updatedAt: now })));
            successCount += chunk.length;
          } catch (err) { errors.push(`Chunk at row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`); }
        }
      }
    } catch (error) { return NextResponse.json({ error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 }); }
    return NextResponse.json({ success: successCount, errors: errors.length > 0 ? errors : undefined });
  });
}
