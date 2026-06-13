import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import EditMileageForm from './EditMileageForm';

export default async function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, parseInt(id)) });
  if (!entry) redirect('/mileage');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Mileage Entry</h1>
        <EditMileageForm entry={entry as any} />
      </main>
    </div>
  );
}