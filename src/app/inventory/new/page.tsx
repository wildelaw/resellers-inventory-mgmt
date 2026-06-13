import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Header from '@/components/header';
import NewItemForm from './NewItemForm';

export default async function NewItemPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Add New Item</h1>
        <NewItemForm />
      </main>
    </div>
  );
}