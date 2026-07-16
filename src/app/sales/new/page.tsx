import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Header from "@/components/header";
import NewSaleForm from "./NewSaleForm";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { canViewAllData } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";

export default async function NewSalePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const isViewAll = canViewAllData(session);
  const inventory = await db
    .select()
    .from(items)
    .where(
      isViewAll
        ? undefined
        : eq(items.ownerId, ownerId)
    )
    .limit(500);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Record Sale</h1>
        <NewSaleForm
          inventory={inventory.map((i) => ({
            id: i.id,
            name: i.name,
            purchasePrice: i.purchasePrice,
            status: i.status,
          }))}
        />
      </main>
    </div>
  );
}
