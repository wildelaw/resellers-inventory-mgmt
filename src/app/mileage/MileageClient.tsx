'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MileageEntry {
  id: number;
  date: number;
  miles: number;
  fromLocation: string | null;
  toLocation: string | null;
  address: string | null;
  vehicle: string | null;
  purpose: string | null;
  ownerId: number;
  createdAt: number;
  updatedAt: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface MileageClientProps {
  initialEntries: MileageEntry[];
  pagination: Pagination;
  totalMiles: number;
  vehicleFilter?: string;
}

export default function MileageClient({
  initialEntries,
  pagination,
  totalMiles,
  vehicleFilter,
}: MileageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const formatDateStr = (ts: number) => new Date(ts * 1000).toLocaleDateString();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mileage Log</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {totalMiles.toFixed(1)} miles across {pagination.total} entries
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/api/mileage/export"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Export CSV
          </Link>
          <Link
            href="/mileage/new"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Add Entry
          </Link>
        </div>
      </div>

      {/* Vehicle filter */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle:</label>
          <input
            type="text"
            value={vehicleFilter || ''}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value) {
                params.set('vehicle', e.target.value);
              } else {
                params.delete('vehicle');
              }
              params.delete('page');
              router.push(`/mileage?${params.toString()}`);
            }}
            placeholder="Filter by vehicle..."
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
          {vehicleFilter && (
            <button
              onClick={() => router.push('/mileage')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Mileage Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {initialEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No mileage entries found. Add your first entry to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Miles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Purpose</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {initialEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link href={`/mileage/${entry.id}/edit`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        {formatDateStr(entry.date)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.fromLocation || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.toLocation || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.miles.toFixed(1)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.vehicle || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.purpose || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} entries
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/mileage?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(pagination.page - 1) }).toString()}`}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Previous
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/mileage?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), page: String(pagination.page + 1) }).toString()}`}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}