import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { updateMileageSchema } from '@/lib/validations';
import { ApiErrors } from '@/lib/api-errors';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const { id } = await params;
    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage entry ID');
    const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
    if (!entry) throw ApiErrors.NotFound('Mileage entry');
    if (!canViewAllData(session) && entry.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    return NextResponse.json({ mileage: entry });
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage entry ID');
    const existing = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
    if (!existing) throw ApiErrors.NotFound('Mileage entry');
    if (session.user.role !== 'admin' && existing.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    const body = await req.json();
    const validation = updateMileageSchema.safeParse(body);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed', details: validation.error.issues.map(e => e.message) }, { status: 400 });
    const now = Math.floor(Date.now() / 1000);
    await db.update(mileage).set({ ...validation.data, updatedAt: now }).where(eq(mileage.id, entryId));
    const updated = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
    return NextResponse.json({ mileage: updated });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(req, async (session) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;
    const { id } = await params;
    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) throw ApiErrors.BadRequest('Invalid mileage entry ID');
    const existing = await db.query.mileage.findFirst({ where: eq(mileage.id, entryId) });
    if (!existing) throw ApiErrors.NotFound('Mileage entry');
    if (session.user.role !== 'admin' && existing.ownerId !== session.user.id) throw ApiErrors.Forbidden();
    await db.delete(mileage).where(eq(mileage.id, entryId));
    return NextResponse.json({ success: true });
  });
}
