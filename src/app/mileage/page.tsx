import { redirect } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { formatDate } from '@/lib/utils';
import PageShell from '@/components/page-shell';

// Server Component — mileage log. Mileage is always owner-scoped (never shared).
export default async function MileagePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const where = eq(mileage.ownerId, sessionUserId(session));
  const [rows, [{ count, totalMiles }]] = await Promise.all([
    db.query.mileage.findMany({
      where,
      orderBy: [desc(mileage.date)],
      limit: 100,
    }),
    db.select({
      count: sql<number>`count(*)`,
      totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
    }).from(mileage).where(where),
  ]);

  return (
    <PageShell>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {Number(count)} trips · {Number(totalMiles).toLocaleString()} miles total
          </p>
        </div>
        <a href="/mileage/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
          Add Trip
        </a>
      </div>

      <div className="mb-4">
        <a href="/api/mileage/export" className="text-blue-600 hover:text-blue-700 text-sm">
          Export CSV
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              {['Date', 'Purpose', 'From', 'To', 'Miles', 'Vehicle', ''].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No trips logged yet.</td></tr>
            )}
            {rows.map((trip) => (
              <tr key={trip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{formatDate(trip.date)}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{trip.purpose ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{trip.fromLocation ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{trip.toLocation ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{trip.miles.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{trip.vehicle ?? '—'}</td>
                <td className="px-4 py-2 text-sm text-right whitespace-nowrap">
                  <a href={`/mileage/${trip.id}/edit`} className="text-blue-600 hover:text-blue-700">Edit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}