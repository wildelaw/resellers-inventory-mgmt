import { and, eq, gte, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';
import { mileageToCsv } from '@/lib/csv';

export const GET = withAuth(async (req, _ctx, session) => {
  const sp = req.nextUrl.searchParams;
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;

  const uid = currentUserId(session);
  const viewAll = session.user.role === 'admin' || session.user.canViewAll === true;

  const conditions = [];
  if (!viewAll) conditions.push(eq(mileage.ownerId, uid));
  if (startTs) conditions.push(gte(mileage.date, Math.floor(startTs)));
  if (endTs) conditions.push(lte(mileage.date, Math.floor(endTs)));
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = db.select().from(mileage).where(where).all().map((r) => ({
    id: r.id,
    date: new Date(r.date * 1000).toISOString().slice(0, 10),
    miles: Number(r.miles),
    fromLocation: r.fromLocation ?? '',
    toLocation: r.toLocation ?? '',
    address: r.address ?? '',
    vehicle: r.vehicle ?? '',
    purpose: r.purpose ?? '',
  }));

  const csv = mileageToCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="mileage.csv"',
      'Cache-Control': 'no-store',
    },
  });
});