import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mileage } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { canEditOthersData } from "@/lib/auth-utils";
import Header from "@/components/header";
import MileageForm from "../../MileageForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMileagePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const mid = Number(id);
  if (!Number.isFinite(mid)) notFound();

  const entry = await db.query.mileage.findFirst({ where: eq(mileage.id, mid) });
  if (!entry) notFound();
  if (entry.ownerId !== Number(session.user.id) && !canEditOthersData(session)) {
    redirect("/mileage");
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Mileage</h1>
        <MileageForm
          initial={{
            id: entry.id,
            date: entry.date,
            miles: entry.miles,
            fromLocation: entry.fromLocation,
            toLocation: entry.toLocation,
            address: entry.address,
            vehicle: entry.vehicle,
            purpose: entry.purpose,
          }}
        />
      </main>
    </div>
  );
}
