import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canAccessResource } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import EditItemClient from './EditItemClient';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = parseInt(id);
  if (isNaN(itemId)) notFound();

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    columns: {
      id: true, name: true, description: true, purchaseDate: true,
      purchasePrice: true, purchaseLocation: true, category: true,
      status: true, notes: true, ownerId: true,
    },
  });

  if (!item) notFound();

  if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
    redirect(`/inventory/${itemId}`);
  }

  return <EditItemClient item={item as any} />;
}
