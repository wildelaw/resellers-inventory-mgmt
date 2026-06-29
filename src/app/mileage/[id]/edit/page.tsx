import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { canAccessResource } from '@/lib/auth-utils';
import Header from '@/components/header';
import MileageEditForm from './MileageEditForm';

export const dynamic = 'force-dynamic';

export default async function EditMileagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, id) });
  if (!entry) notFound();
  if (!canAccessResource(entry.ownerId, session.user.id, session, 'write')) notFound();

  return (
    <div className="min-h-screen">
      <Header />
      <MileageEditForm initial={entry} />
    </div>
  );
}