import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/schema";
import Header from "@/components/header";
import SettingsForm from "./SettingsForm";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  let config = await db.query.appConfig.findFirst();
  if (!config) {
    const now = Math.floor(Date.now() / 1000);
    await db.insert(appConfig).values({ id: 1, updatedAt: now });
    config = (await db.query.appConfig.findFirst())!;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <SettingsForm
          initial={{
            companyName: config.companyName,
            companyTagline: config.companyTagline,
            salesTaxRate: config.salesTaxRate,
          }}
        />
      </main>
    </div>
  );
}
