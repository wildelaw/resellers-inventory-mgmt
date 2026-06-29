import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { items } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import Header from '@/components/header';
import ItemEditForm from './ItemEditForm';

export const dynamic = 'force-dynamic';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const item = await db.query.items.findFirst({ where: eq(items.id, id) });
  if (!item) notFound();
  if (!canAccessResource(item.ownerId, session.user.id, session, 'write')) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Header />
      <ItemEditForm initial={item} />
    </div>
  );
}