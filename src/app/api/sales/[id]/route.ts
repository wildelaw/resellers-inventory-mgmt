import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { items, sales } from '@/lib/schema';
import { updateSaleSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const { id } = await params;
    const saleId = parseInt(id, 10);
    if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');
    const sale = await db.query.sales.findFirst({ where: eq(sales.id, saleId), with: { item: true, seller: true } });
    if (!sale) throw ApiErrors.NotFound('Sale');
    if (!canViewAllData(session) && sale.soldBy !== session.user.id) throw ApiErrors.Forbidden();
    return NextResponse.json({ sale });
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const saleId = parseInt(id, 10);
    if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');
    const existing = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!existing) throw ApiErrors.NotFound('Sale');
    if (session.user.role !== 'admin' && existing.soldBy !== session.user.id) throw ApiErrors.Forbidden();
    const body = await req.json();
    const validation = updateSaleSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    await db.update(sales).set(validation.data).where(eq(sales.id, saleId));
    const updated = await db.query.sales.findFirst({ where: eq(sales.id, saleId), with: { item: true } });
    return NextResponse.json({ sale: updated });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const saleId = parseInt(id, 10);
    if (isNaN(saleId)) throw ApiErrors.BadRequest('Invalid sale ID');
    const existing = await db.query.sales.findFirst({ where: eq(sales.id, saleId) });
    if (!existing) throw ApiErrors.NotFound('Sale');
    if (session.user.role !== 'admin' && existing.soldBy !== session.user.id) throw ApiErrors.Forbidden();
    await db.transaction(async (tx) => {
      await tx.delete(sales).where(eq(sales.id, saleId));
      if (existing.itemId) {
        const item = await tx.query.items.findFirst({ where: eq(items.id, existing.itemId) });
        if (item && ['sold', 'returned'].includes(item.status)) {
          await tx.update(items).set({ status: 'available', removalDate: null, updatedAt: Math.floor(Date.now() / 1000) }).where(eq(items.id, existing.itemId));
        }
      }
    });
    return NextResponse.json({ success: true });
  });
}
