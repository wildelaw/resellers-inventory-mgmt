import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, getSqlite } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { canAccessResource, sessionUserId } from '@/lib/auth-utils';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors, handleApiError } from '@/lib/api-errors';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (_req, ctx, session) => {
    const { id } = await ctx.params;
    const saleId = Number(id);
    if (!Number.isInteger(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const sale = await db.query.sales.findFirst({
      where: eq(sales.id, saleId),
      with: { item: true },
    });
    if (!sale) throw ApiErrors.NotFound('Sale');

    // RBAC: creator, admin, or canViewAll may view.
    if (sale.soldBy !== sessionUserId(session) && session.user.role !== 'admin' && !(session.user as { canViewAll: boolean }).canViewAll) {
      throw ApiErrors.Forbidden();
    }
    return NextResponse.json(sale);
  })(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const saleId = Number(id);
    if (!Number.isInteger(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!sale) throw ApiErrors.NotFound('Sale');
    if (sale.soldBy !== sessionUserId(session) && session.user.role !== 'admin') throw ApiErrors.Forbidden();

    const body = await req.json();
    const parsed = updateSaleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }

    const updated = db.update(sales).set(parsed.data).where(eq(sales.id, saleId)).returning();
    return NextResponse.json(updated[0]);
  })(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return withAuth(async (req, ctx, session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const { id } = await ctx.params;
    const saleId = Number(id);
    if (!Number.isInteger(saleId) || saleId <= 0) throw ApiErrors.BadRequest('Invalid id');

    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!sale) throw ApiErrors.NotFound('Sale');
    if (sale.soldBy !== sessionUserId(session) && session.user.role !== 'admin') throw ApiErrors.Forbidden();

    const now = Math.floor(Date.now() / 1000);
    const sqlite = getSqlite();

    sqlite.transaction(() => {
      db.delete(sales).where(eq(sales.id, saleId)).run();
      // Revert item status to available if currently sold or returned.
      if (sale.itemId) {
        const item = db.query.items.findFirst({ where: eq(items.id, sale.itemId) });
        if (item && (item.status === 'sold' || item.status === 'returned')) {
          db.update(items)
            .set({ status: 'available', removalDate: null, updatedAt: now })
            .where(eq(items.id, sale.itemId))
            .run();
        }
      }
    })();

    return NextResponse.json({ success: true });
  })(req, ctx);
}
