import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { parseDateParam } from '@/lib/utils';

export const GET = withAuth(async (req, _ctx, session) => {
  const { searchParams } = new URL(req.url);
  const viewAll = canViewAllData(session);

  const conditions = [];
  if (!viewAll) {
    conditions.push(eq(mileage.ownerId, Number(session.user.id)));
  }

  const dateFrom = parseDateParam(searchParams.get('dateFrom'));
  const dateTo = parseDateParam(searchParams.get('dateTo'));

  if (dateFrom !== null) {
    conditions.push(gte(mileage.date, dateFrom));
  }
  if (dateTo !== null) {
    conditions.push(lte(mileage.date, dateTo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Aggregate totals
  const totals = await db.select({
    totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
    totalTrips: sql<number>`count(*)`,
    avgMiles: sql<number>`coalesce(avg(${mileage.miles}), 0)`,
  }).from(mileage).where(whereClause).get();

  // By-month breakdown
  const byMonth = await db.select({
    year: sql<number>`cast(strftime('%Y', ${mileage.date}, 'unixepoch') as integer)`,
    month: sql<number>`cast(strftime('%m', ${mileage.date}, 'unixepoch') as integer)`,
    totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
    totalTrips: sql<number>`count(*)`,
    avgMiles: sql<number>`coalesce(avg(${mileage.miles}), 0)`,
  }).from(mileage).where(whereClause)
    .groupBy(sql`strftime('%Y-%m', ${mileage.date}, 'unixepoch')`)
    .orderBy(desc(sql`strftime('%Y-%m', ${mileage.date}, 'unixepoch')`))
    .all();

  // By-vehicle breakdown
  const byVehicle = await db.select({
    vehicle: mileage.vehicle,
    totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
    totalTrips: sql<number>`count(*)`,
    avgMiles: sql<number>`coalesce(avg(${mileage.miles}), 0)`,
  }).from(mileage).where(whereClause)
    .groupBy(mileage.vehicle)
    .orderBy(desc(sql`sum(${mileage.miles})`))
    .all();

  return NextResponse.json({
    totals: totals ?? { totalMiles: 0, totalTrips: 0, avgMiles: 0 },
    byMonth,
    byVehicle,
  });
});