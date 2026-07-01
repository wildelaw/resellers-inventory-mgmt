import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { canAccessResource } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import EditMileageClient from './EditMileageClient';

export default async function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) notFound();

  const entry = await db.query.mileage.findFirst({
    where: eq(mileage.id, entryId),
  });

  if (!entry) notFound();

  if (!canAccessResource(entry.ownerId, session.user.id, session, 'write')) {
    redirect('/mileage');
  }

  return <EditMileageClient entry={entry as any} />;
}
