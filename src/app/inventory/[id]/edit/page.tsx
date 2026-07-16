import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { canEditOthersData } from "@/lib/auth-utils";
import EditItemForm from "./EditItemForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) notFound();

  const item = await db.query.items.findFirst({ where: eq(items.id, itemId) });
  if (!item) notFound();
  if (item.ownerId !== Number(session.user.id) && !canEditOthersData(session)) {
    redirect("/inventory");
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Item</h1>
        <EditItemForm
          item={{
            id: item.id,
            name: item.name,
            description: item.description,
            purchaseDate: item.purchaseDate,
            purchasePrice: item.purchasePrice,
            purchaseLocation: item.purchaseLocation,
            category: item.category,
            status: item.status,
            notes: item.notes,
          }}
        />
      </main>
    </div>
  );
}
