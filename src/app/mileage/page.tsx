import { and, eq, gte, lte, desc, asc, sql } from 'drizzle-orm';
import Link from 'next/link';
import AppShell from '@/components/app-shell';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { currentUserId } from '@/lib/auth-utils';
import { parsePagination, parseSortParams } from '@/lib/api-utils';
import { formatDate } from '@/lib/utils';

export default async function MileagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const sp = new URLSearchParams();
  const params = await searchParams;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'string') sp.set(k, v); else if (Array.isArray(v) && v[0]) sp.set(k, v[0]);
  }
  const { limit, offset } = parsePagination(sp);
  const { sortBy, sortOrder } = parseSortParams(sp, ['date', 'miles'], 'date');
  const uid = currentUserId(session);
  const viewAll = session.user.role === 'admin' || session.user.canViewAll === true;

  const conditions = [];
  if (!viewAll) conditions.push(eq(mileage.ownerId, uid));
  const startTs = sp.get('startDate') ? new Date(sp.get('startDate') as string).getTime() / 1000 : null;
  const endTs = sp.get('endDate') ? new Date(sp.get('endDate') as string).getTime() / 1000 : null;
  if (startTs) conditions.push(gte(mileage.date, Math.floor(startTs)));
  if (endTs) conditions.push(lte(mileage.date, Math.floor(endTs)));
  const where = conditions.length ? and(...conditions) : undefined;

  const orderFn = sortOrder === 'asc' ? asc : desc;
  const sortCol = sortBy === 'miles' ? mileage.miles : mileage.date;
  const total = db.select({ c: sql<number>`COUNT(*)` }).from(mileage).where(where).get()?.c ?? 0;
  const rows = db.query.mileage.findMany({ where, orderBy: [orderFn(sortCol)], limit, offset }).sync();
  const totalMiles = rows.reduce((s, r) => s + Number(r.miles), 0);

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mileage</h1>
        <div className="flex gap-2">
          <Link href="/mileage/export" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 px-4 py-2 rounded-md text-sm">Export CSV</Link>
          <Link href="/mileage/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">Add Entry</Link>
        </div>
      </div>

      <form className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 flex flex-wrap gap-2">
        <input type="date" name="startDate" defaultValue={sp.get('startDate') || ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        <input type="date" name="endDate" defaultValue={sp.get('endDate') || ''} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white" />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm">Filter</button>
        <Link href="/mileage" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Clear</Link>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-left">
            <tr><th className="p-3">Date</th><th className="p-3">Miles</th><th className="p-3">From</th><th className="p-3">To</th><th className="p-3">Vehicle</th><th className="p-3">Purpose</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">No mileage entries.</td></tr>}
            {rows.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3"><Link href={`/mileage/${m.id}/edit`} className="text-blue-600 dark:text-blue-400 hover:underline">{formatDate(m.date)}</Link></td>
                <td className="p-3">{Number(m.miles).toFixed(1)}</td>
                <td className="p-3">{m.fromLocation || '—'}</td>
                <td className="p-3">{m.toLocation || '—'}</td>
                <td className="p-3">{m.vehicle || '—'}</td>
                <td className="p-3">{m.purpose || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{totalMiles.toFixed(1)} miles across {total} entries.</p>
    </AppShell>
  );
}