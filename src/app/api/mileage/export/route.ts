import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { dateParamToTimestamp } from '@/lib/utils';
import { mileageToCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

// GET /api/mileage/export — CSV export, own data only
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const startDate = dateParamToTimestamp(sp.get('startDate'));
    const endDate = dateParamToTimestamp(sp.get('endDate'));

    const conditions = [eq(mileage.ownerId, Number(session.user.id))];
    if (startDate !== null) conditions.push(gte(mileage.date, startDate));
    if (endDate !== null) conditions.push(lte(mileage.date, endDate));
    const where = and(...conditions);

    const rows = db.select().from(mileage).where(where).all();
    const csv = mileageToCsv(rows);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mileage-${ts}.csv"`,
      },
    });
  })(req, { params: Promise.resolve({}) });
}