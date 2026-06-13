import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { mileageToCsv } from '@/lib/csv';
import { parseDateParam } from '@/lib/utils';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);

  const conditions = [eq(mileage.ownerId, Number(session.user.id))];

  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));

  if (dateFrom !== null) {
    conditions.push(gte(mileage.date, dateFrom));
  }
  if (dateTo !== null) {
    conditions.push(lte(mileage.date, dateTo));
  }

  const whereClause = and(...conditions);

  const entries = await db.select().from(mileage)
    .where(whereClause)
    .orderBy(desc(mileage.date))
    .all();

  const csv = mileageToCsv(entries);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="mileage-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});