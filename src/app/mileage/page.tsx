import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import Link from 'next/link';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

export default async function MileagePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const entries = await db.query.mileage.findMany({
    where: eq(mileage.ownerId, parseInt(session.user.id)),
    orderBy: desc(mileage.date),
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mileage</h1>
          <div className="flex space-x-2">
            <Link href="/mileage/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">Add Entry</Link>
            <a href="/api/mileage/export" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-md transition-colors">Export CSV</a>
          </div>
        </div>
        {entries.length === 0 ? (<p className="text-gray-500 dark:text-gray-400">No mileage entries yet.</p>) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Miles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{formatDate(entry.date)}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white">{entry.miles}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.fromLocation || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.toLocation || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.purpose || '-'}</td>
                    <td className="px-6 py-4"><Link href={`/mileage/${entry.id}/edit`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}