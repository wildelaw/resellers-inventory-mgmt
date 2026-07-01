import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { handleApiError, ApiErrors } from '@/lib/api-errors';
import { eq } from 'drizzle-orm';

/**
 * GET /api/sales/[id]
 * Get a single sale
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const { id } = await params;
    const saleId = parseInt(id);

    if (isNaN(saleId)) {
      throw ApiErrors.BadRequest('Invalid sale ID');
    }

    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
      with: {
        item: {
          columns: {
            id: true,
            name: true,
            purchasePrice: true,
            ownerId: true,
          },
        },
        seller: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sale) {
      throw ApiErrors.NotFound('Sale');
    }

    // Check access (sale creator, admin, or canViewAll)
    if (session.user.role !== 'admin' && !session.user.canViewAll) {
      if (sale.soldBy !== parseInt(session.user.id)) {
        throw ApiErrors.Forbidden();
      }
    }

    return NextResponse.json(sale);
  })(req, { params });
}

/**
 * PUT /api/sales/[id]
 * Update a sale
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const saleId = parseInt(id);

    if (isNaN(saleId)) {
      throw ApiErrors.BadRequest('Invalid sale ID');
    }

    // Get existing sale
    const existingSale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
    });

    if (!existingSale) {
      throw ApiErrors.NotFound('Sale');
    }

    // Check write access (sale creator or admin)
    if (session.user.role !== 'admin' && existingSale.soldBy !== parseInt(session.user.id)) {
      throw ApiErrors.Forbidden();
    }

    const body = await req.json();
    const validation = updateSaleSchema.safeParse(body);

    if (!validation.success) {
      throw ApiErrors.ValidationError(
        'Validation failed',
        validation.error.issues.map(i => i.message)
      );
    }

    const [updatedSale] = await db
      .update(sales)
      .set(validation.data)
      .where(eq(sales.id, saleId))
      .returning();

    return NextResponse.json(updatedSale);
  })(req, { params });
}

/**
 * DELETE /api/sales/[id]
 * Delete a sale and revert item status
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await params;
    const saleId = parseInt(id);

    if (isNaN(saleId)) {
      throw ApiErrors.BadRequest('Invalid sale ID');
    }

    // Get existing sale
    const existingSale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
    });

    if (!existingSale) {
      throw ApiErrors.NotFound('Sale');
    }

    // Check write access
    if (session.user.role !== 'admin' && existingSale.soldBy !== parseInt(session.user.id)) {
      throw ApiErrors.Forbidden();
    }

    // Delete sale and revert item status in transaction
    await db.transaction(async (tx) => {
      await tx.delete(sales).where(eq(sales.id, saleId));

      // If sale had an item, revert its status to available
      if (existingSale.itemId) {
        const item = await tx.query.items.findFirst({
          where: eq(items.id, existingSale.itemId),
        });

        if (item && (item.status === 'sold' || item.status === 'returned')) {
          await tx
            .update(items)
            .set({
              status: 'available',
              removalDate: null,
              updatedAt: new Date(),
            })
            .where(eq(items.id, existingSale.itemId));
        }
      }
    });

    return NextResponse.json({ success: true });
  })(req, { params });
}
