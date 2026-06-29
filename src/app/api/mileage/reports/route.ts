import { NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { currentUserId } from '@/lib/auth-utils';

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

  const rows = db.select().from(mileage).where(where).all();

  const totalMiles = rows.reduce((s, r) => s + Number(r.miles), 0);
  const trips = rows.length;
  const avgMiles = trips > 0 ? totalMiles / trips : 0;

  // By month: YYYY-MM
  const byMonth = new Map<string, { month: string; miles: number; trips: number }>();
  for (const r of rows) {
    const d = new Date(r.date * 1000);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(month) ?? { month, miles: 0, trips: 0 };
    cur.miles += Number(r.miles);
    cur.trips += 1;
    byMonth.set(month, cur);
  }

  // By vehicle
  const byVehicle = new Map<string, { vehicle: string; miles: number; trips: number }>();
  for (const r of rows) {
    const key = r.vehicle || 'Unspecified';
    const cur = byVehicle.get(key) ?? { vehicle: key, miles: 0, trips: 0 };
    cur.miles += Number(r.miles);
    cur.trips += 1;
    byVehicle.set(key, cur);
  }

  return NextResponse.json({
    totalMiles,
    trips,
    avgMiles,
    byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
    byVehicle: Array.from(byVehicle.values()).sort((a, b) => b.miles - a.miles),
  });
});