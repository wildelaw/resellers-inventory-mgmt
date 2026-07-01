import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { canAccessResource, canEditOthersData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import ItemDetailClient from './ItemDetailClient';

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const itemId = parseInt(id);
  if (isNaN(itemId)) notFound();

  const item = await db.query.items.findFirst({
    where: eq(items.id, itemId),
    with: {
      photos: true,
      sales: {
        with: {
          seller: { columns: { id: true, name: true } },
        },
      },
      owner: { columns: { id: true, name: true, email: true } },
    },
  });

  if (!item) notFound();

  if (!canAccessResource(item.ownerId, session.user.id, session, 'read')) {
    redirect('/inventory');
  }

  const canEdit = canAccessResource(item.ownerId, session.user.id, session, 'write');

  return <ItemDetailClient item={item as any} canEdit={canEdit} />;
}
