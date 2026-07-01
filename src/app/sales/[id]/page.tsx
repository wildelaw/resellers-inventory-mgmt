import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales } from '@/lib/schema';
import { canAccessResource } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import SaleDetailClient from './SaleDetailClient';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const saleId = parseInt(id);
  if (isNaN(saleId)) notFound();

  const sale = await db.query.sales.findFirst({
    where: eq(sales.id, saleId),
    with: {
      item: {
        columns: { id: true, name: true, purchasePrice: true, status: true },
      },
      seller: { columns: { id: true, name: true, email: true } },
    },
  });

  if (!sale) notFound();

  if (!canAccessResource(sale.soldBy, session.user.id, session, 'read')) {
    redirect('/sales');
  }

  const canEdit = canAccessResource(sale.soldBy, session.user.id, session, 'write');

  return <SaleDetailClient sale={sale as any} canEdit={canEdit} />;
}
