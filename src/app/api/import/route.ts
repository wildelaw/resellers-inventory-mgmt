import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { importSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { 
  parseCSV, 
  mapColumns, 
  inventoryColumnMappings, 
  salesColumnMappings, 
  mileageColumnMappings,
  parseDate,
  parsePrice,
  fuzzyMatchItem
} from '@/lib/csv-parser';
import { mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/import
 * Import data from CSV
 */
export async function POST(req: NextRequest) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const { type, csvData, columnMappings } = validation.data;

    // Parse CSV
    const { data, errors: parseErrors } = parseCSV(csvData);

    if (parseErrors.length > 0) {
      throw ApiErrors.BadRequest(`CSV parsing errors: ${parseErrors.join('; ')}`);
    }

    if (data.length === 0) {
      throw ApiErrors.BadRequest('CSV file is empty');
    }

    if (data.length > 32000) {
      throw ApiErrors.BadRequest('CSV file too large (max 32,000 rows)');
    }

    const errors: string[] = [];
    let successCount = 0;

    if (type === 'inventory') {
      // Map columns
      const mapped = mapColumns(data, inventoryColumnMappings, columnMappings as Record<string, string> | undefined);

      // Import inventory items
      for (let i = 0; i < mapped.length; i++) {
        const row = mapped[i];

        try {
          if (!row.name) {
            errors.push(`Row ${i + 1}: Missing name`);
            continue;
          }

          const purchaseDate = parseDate(row.purchaseDate) || new Date();
          const purchasePrice = parsePrice(row.purchasePrice) || 0;

          await db.insert(items).values({
            name: row.name,
            description: row.description || null,
            purchaseDate,
            purchasePrice,
            purchaseLocation: row.purchaseLocation || null,
            category: row.category || null,
            notes: row.notes || null,
            status: 'available',
            ownerId: parseInt(session.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          successCount++;
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'sales') {
      // Map columns
      const mapped = mapColumns(data, salesColumnMappings, columnMappings as Record<string, string> | undefined);

      // Get user's items for fuzzy matching
      const userItems = await db.query.items.findMany({
        where: eq(items.ownerId, parseInt(session.user.id)),
      });

      // Import sales
      for (let i = 0; i < mapped.length; i++) {
        const row = mapped[i];

        try {
          const soldDate = parseDate(row.soldDate) || new Date();
          const soldPrice = parsePrice(row.soldPrice);

          if (!soldPrice || soldPrice <= 0) {
            errors.push(`Row ${i + 1}: Invalid sold price`);
            continue;
          }

          let itemId: number | null = null;

          // Try to match item
          if (row.itemId) {
            const id = parseInt(row.itemId);
            if (!isNaN(id)) {
              const item = userItems.find(i => i.id === id);
              if (item) itemId = id;
            }
          }

          if (!itemId && row.itemName) {
            const purchasePrice = parsePrice(row.purchasePrice);
            itemId = fuzzyMatchItem(
              row.itemName,
              soldDate,
              purchasePrice,
              userItems
            );
          }

          // Create sale
          await db.insert(sales).values({
            itemId,
            soldDate,
            soldPrice,
            shippingCost: parsePrice(row.shippingCost) || null,
            shippingCollected: parsePrice(row.shippingCollected) || 0,
            platform: row.platform || 'other',
            salesTax: parsePrice(row.salesTax) || null,
            platformFees: parsePrice(row.platformFees) || 0,
            soldBy: parseInt(session.user.id),
            createdAt: new Date(),
          });

          // Update item status if matched
          if (itemId) {
            await db
              .update(items)
              .set({
                status: 'sold',
                removalDate: soldDate,
                updatedAt: new Date(),
              })
              .where(eq(items.id, itemId));
          }

          successCount++;
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } else if (type === 'mileage') {
      // Map columns
      const mapped = mapColumns(data, mileageColumnMappings, columnMappings as Record<string, string> | undefined);

      // Import mileage entries in batches
      const batchSize = 100;
      for (let i = 0; i < mapped.length; i += batchSize) {
        const batch = mapped.slice(i, i + batchSize);
        const validEntries = [];

        for (let j = 0; j < batch.length; j++) {
          const row = batch[j];
          const rowNum = i + j + 1;

          const date = parseDate(row.date);
          const miles = parsePrice(row.miles);

          if (!date) {
            errors.push(`Row ${rowNum}: Invalid date`);
            continue;
          }

          if (!miles || miles <= 0) {
            errors.push(`Row ${rowNum}: Invalid miles`);
            continue;
          }

          validEntries.push({
            date,
            miles,
            fromLocation: row.fromLocation || null,
            toLocation: row.toLocation || null,
            address: row.address || null,
            vehicle: row.vehicle || null,
            purpose: row.purpose || null,
            ownerId: parseInt(session.user.id),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        if (validEntries.length > 0) {
          await db.insert(mileage).values(validEntries);
          successCount += validEntries.length;
        }
      }
    }

    return NextResponse.json({
      success: successCount,
      errors: errors.slice(0, 100), // Limit error messages
      totalRows: data.length,
    });
  })(req);
}
