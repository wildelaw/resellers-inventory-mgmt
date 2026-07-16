"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({
  initial,
}: {
  initial: { companyName: string; companyTagline: string; salesTaxRate: number };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyTagline, setCompanyTagline] = useState(initial.companyTagline);
  const [salesTaxRate, setSalesTaxRate] = useState(String(initial.salesTaxRate * 100));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyTagline,
          salesTaxRate: parseFloat(salesTaxRate) / 100,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessage("Settings saved.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadBackup() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!confirm("Restore from backup? This will replace ALL existing data.")) {
      e.target.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const text = await f.text();
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessage("Backup restored.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function unlockSetup() {
    if (!confirm("Re-open setup? Allows creating a new admin account.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/setup-unlock", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessage("Setup re-opened.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && <div className="p-2 rounded bg-green-100 text-green-800 text-sm">{message}</div>}
      {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      <form onSubmit={save} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        <h2 className="font-semibold">Company</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input
            type="text"
            value={companyTagline}
            onChange={(e) => setCompanyTagline(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sales Tax Rate (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={salesTaxRate}
            onChange={(e) => setSalesTaxRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Save Settings
        </button>
      </form>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        <h2 className="font-semibold">Backup</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadBackup}
            disabled={busy}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-3 py-1.5 rounded-md text-sm"
          >
            Download Backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={uploadRestore}
            className="text-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-3">
        <h2 className="font-semibold">Setup</h2>
        <button
          onClick={unlockSetup}
          disabled={busy}
          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md text-sm"
        >
          Re-open Setup
        </button>
      </div>
    </div>
  );
}
