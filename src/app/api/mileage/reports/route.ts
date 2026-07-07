import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const uid = sessionUserId(session);
    const conditions = [eq(mileage.ownerId, uid)];
    const startDate = sp.get('startDate');
    if (startDate) {
      const ts = Math.floor(new Date(startDate).getTime() / 1000);
      if (!isNaN(ts)) conditions.push(gte(mileage.date, ts));
    }
    const endDate = sp.get('endDate');
    if (endDate) {
      const ts = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
      if (!isNaN(ts)) conditions.push(lte(mileage.date, ts));
    }
    const where = and(...conditions);

    const rows = await db.query.mileage.findMany({ where });

    const totalMiles = rows.reduce((s, r) => s + r.miles, 0);
    const totalTrips = rows.length;
    const avgMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

    // By month.
    const byMonth: Record<string, { miles: number; trips: number }> = {};
    for (const r of rows) {
      const d = new Date(r.date * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { miles: 0, trips: 0 };
      byMonth[key].miles += r.miles;
      byMonth[key].trips += 1;
    }

    // By vehicle.
    const byVehicle: Record<string, { miles: number; trips: number }> = {};
    for (const r of rows) {
      const key = r.vehicle || 'Unspecified';
      if (!byVehicle[key]) byVehicle[key] = { miles: 0, trips: 0 };
      byVehicle[key].miles += r.miles;
      byVehicle[key].trips += 1;
    }

    return NextResponse.json({
      totalMiles,
      totalTrips,
      avgMiles,
      byMonth,
      byVehicle,
    });
  })(req, { params: Promise.resolve({}) });
}
