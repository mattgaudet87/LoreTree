"use client";

import { useEffect, useRef, useState } from "react";

interface Stats {
  imported: number;
  analyzed: number;
  waiting: number;
  errors: number;
}

interface AnalyzeResult {
  succeeded: number;
  failed: number;
  estimatedCost: number;
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats");
  return res.json();
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<"analyze" | "retry" | null>(null);
  const [lastResult, setLastResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchStats().then(setStats);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function runBatch(mode: "analyze" | "retry") {
    setBusy(mode);
    setLastResult(null);
    setError(null);

    pollRef.current = setInterval(() => {
      fetchStats().then(setStats);
    }, 1000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "retry" ? { retryErrors: true } : {}),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const result: AnalyzeResult = await res.json();
      setLastResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setBusy(null);
      fetchStats().then(setStats);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col gap-6 px-6 py-10">
      <h1 className="text-lg font-medium text-text">Settings</h1>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Imported" value={stats?.imported} />
        <StatTile label="Analyzed" value={stats?.analyzed} />
        <StatTile label="Waiting" value={stats?.waiting} />
        <StatTile label="Errors" value={stats?.errors} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => runBatch("analyze")}
          disabled={busy !== null || !stats || stats.waiting === 0}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
        >
          {busy === "analyze" ? `Analyzing… ${stats?.analyzed ?? 0} done` : "Analyze next 20"}
        </button>

        <button
          onClick={() => runBatch("retry")}
          disabled={busy !== null || !stats || stats.errors === 0}
          className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text transition-opacity disabled:opacity-40"
        >
          {busy === "retry" ? `Retrying… ${stats?.errors ?? 0} left` : "Retry errors"}
        </button>
      </div>

      {lastResult && (
        <p className="text-sm text-text-muted">
          {lastResult.succeeded} analyzed, {lastResult.failed} failed. Estimated cost: $
          {lastResult.estimatedCost.toFixed(4)}.
        </p>
      )}
      {error && <p className="text-sm text-node-events">{error}</p>}

      <p className="mt-auto text-xs text-text-muted">
        New photos come from running <code className="text-text">npm run import</code> in Terminal.
      </p>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-xl font-medium text-text">{value ?? "–"}</div>
      <div className="text-xs text-text-muted">{label}</div>
    </div>
  );
}
