import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { mileageToCsv } from '@/lib/csv';
import { eq, gte, lte } from 'drizzle-orm';

export const GET = withAuth(async (req, ctx, session) => {
  const url = new URL(req.url);
  const userId = parseInt(session.user.id);

  const conditions = [eq(mileage.ownerId, userId)];
  const startDate = url.searchParams.get('startDate');
  if (startDate) conditions.push(gte(mileage.date, new Date(startDate)));
  const endDate = url.searchParams.get('endDate');
  if (endDate) conditions.push(lte(mileage.date, new Date(endDate)));

  const entries = await db.query.mileage.findMany({
    where: (mileage, { and }) => and(...conditions),
    orderBy: (mileage, { desc }) => [desc(mileage.date)],
  });

  const csv = mileageToCsv(entries);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=mileage-export.csv',
    },
  });
});