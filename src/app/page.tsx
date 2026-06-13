import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Header from '@/components/header';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <a
            href="/inventory/new"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 text-center transition-colors"
          >
            <h2 className="text-xl font-semibold">Add Item</h2>
            <p className="text-blue-100 mt-1">Add a new inventory item</p>
          </a>
          <a
            href="/sales/new"
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 text-center transition-colors"
          >
            <h2 className="text-xl font-semibold">Record Sale</h2>
            <p className="text-green-100 mt-1">Record a new sale</p>
          </a>
        </div>

        <div className="text-center text-gray-500 dark:text-gray-400 py-12">
          <p>Dashboard statistics are available via the <a href="/reports" className="text-blue-600 hover:underline">Reports</a> page.</p>
        </div>
      </main>
    </div>
  );
}