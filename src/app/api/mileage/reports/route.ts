import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, gte, lte, sql } from 'drizzle-orm';

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

  const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0);
  const totalTrips = entries.length;
  const avgMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

  const byMonth: Record<string, { miles: number; trips: number }> = {};
  const byVehicle: Record<string, { miles: number; trips: number }> = {};

  for (const entry of entries) {
    const monthKey = new Date(entry.date as any).toISOString().slice(0, 7);
    byMonth[monthKey] = byMonth[monthKey] || { miles: 0, trips: 0 };
    byMonth[monthKey].miles += entry.miles;
    byMonth[monthKey].trips += 1;

    const vehicleKey = entry.vehicle || 'Unspecified';
    byVehicle[vehicleKey] = byVehicle[vehicleKey] || { miles: 0, trips: 0 };
    byVehicle[vehicleKey].miles += entry.miles;
    byVehicle[vehicleKey].trips += 1;
  }

  return NextResponse.json({
    totalMiles,
    totalTrips,
    avgMiles: Math.round(avgMiles * 100) / 100,
    byMonth,
    byVehicle,
  });
});