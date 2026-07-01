import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sales, items } from '@/lib/schema';
import { canViewAllData } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import SalesClient from './SalesClient';

export default async function SalesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const viewAll = canViewAllData(session);
  const where = viewAll ? undefined : eq(sales.soldBy, parseInt(session.user.id));

  const [salesList, itemsList] = await Promise.all([
    db.query.sales.findMany({
      where,
      with: {
        item: { columns: { id: true, name: true, purchasePrice: true } },
        seller: { columns: { id: true, name: true } },
      },
      orderBy: (s, { desc }) => [desc(s.soldDate)],
      limit: 50,
    }),
    db.query.items.findMany({
      where: eq(items.ownerId, parseInt(session.user.id)),
      columns: { id: true, name: true, purchasePrice: true, status: true },
      orderBy: (i, { asc }) => [asc(i.name)],
    }),
  ]);

  return (
    <SalesClient
      initialSales={salesList as any}
      availableItems={itemsList as any}
      canViewAll={viewAll}
    />
  );
}
