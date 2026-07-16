import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/lib/session-provider";

export const metadata: Metadata = {
  title: "Resell Inventory Manager",
  description: "Self-hosted inventory and sales tracking for resellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
