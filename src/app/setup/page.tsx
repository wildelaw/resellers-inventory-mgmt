"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "choose" | "create" | "restore";

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [needsSetup, setNeedsSetup] = useState(true);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        if (!d.needsSetup) router.replace("/login");
        setNeedsSetup(true);
      })
      .catch(() => null);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
        {mode === "choose" && <ChooseMode onMode={setMode} />}
        {mode === "create" && <CreateAdmin onDone={() => router.push("/login")} />}
        {mode === "restore" && <RestoreBackup onDone={() => router.push("/login")} />}
      </div>
    </div>
  );
}

function ChooseMode({ onMode }: { onMode: (m: Mode) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-center">Welcome</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
        Get started by setting up your reseller inventory manager.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => onMode("create")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium"
        >
          Create New Database
        </button>
        <button
          onClick={() => onMode("restore")}
          className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 py-3 rounded-md font-medium"
        >
          Restore from Backup
        </button>
      </div>
    </div>
  );
}

function CreateAdmin({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        onDone();
      } else {
        router_replace(onDone);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-2xl font-bold text-center">Create Admin</h1>
      <input
        type="text"
        required
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
      />
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
      />
      <input
        type="password"
        required
        placeholder="Password (8+ chars, mixed case, digit, special)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
      />
      {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium"
      >
        {busy ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}

function RestoreBackup({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-center">Restore Backup</h1>
      <input
        type="file"
        accept="application/json"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="w-full text-sm"
      />
      {error && <div className="p-2 rounded bg-red-100 text-red-800 text-sm">{error}</div>}
      <button
        onClick={submit}
        disabled={busy || !file}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium disabled:opacity-50"
      >
        {busy ? "Restoring..." : "Restore"}
      </button>
    </div>
  );
}

function router_replace(onDone: () => void) {
  onDone();
}
