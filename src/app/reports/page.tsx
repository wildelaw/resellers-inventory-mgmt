import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>
        <p className="text-gray-500 dark:text-gray-400">Report data is loaded via the API. Use the Reports endpoint to fetch statistics.</p>
        <div className="mt-4"><a href="/api/reports" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">View Raw Report Data (JSON)</a></div>
        <div className="mt-4"><a href="/api/mileage/reports" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">View Mileage Reports (JSON)</a></div>
      </main>
    </div>
  );
}