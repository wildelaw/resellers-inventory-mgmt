import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { canViewAllData } from '@/lib/auth-utils';
import { dateParamToTimestamp } from '@/lib/utils';
import { salesToCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

// GET /api/sales/export — CSV export of sales
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const startDate = dateParamToTimestamp(sp.get('startDate'));
    const endDate = dateParamToTimestamp(sp.get('endDate'));

    const conditions = [];
    if (!canViewAllData(session)) conditions.push(eq(sales.soldBy, Number(session.user.id)));
    if (startDate !== null) conditions.push(gte(sales.soldDate, startDate));
    if (endDate !== null) conditions.push(lte(sales.soldDate, endDate));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = where ? db.select().from(sales).where(where).all() : db.select().from(sales).all();
    const csv = salesToCsv(rows);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sales-${ts}.csv"`,
      },
    });
  })(req, { params: Promise.resolve({}) });
}