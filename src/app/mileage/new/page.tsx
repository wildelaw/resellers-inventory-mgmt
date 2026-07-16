import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Header from "@/components/header";
import MileageForm from "../MileageForm";

export default async function NewMileagePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">New Mileage Entry</h1>
        <MileageForm />
      </main>
    </div>
  );
}
