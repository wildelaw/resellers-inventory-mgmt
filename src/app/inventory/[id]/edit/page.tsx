import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import EditItemForm from './EditItemForm';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const item = await db.query.items.findFirst({ where: eq(items.id, parseInt(id)) });
  if (!item) redirect('/inventory');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit Item</h1>
        <EditItemForm item={item as any} />
      </main>
    </div>
  );
}