"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Stats {
  imported: number;
  analyzed: number;
  waiting: number;
  errors: number;
  errorReasons: { reason: string; count: number }[];
  estimatedCostPerPhoto: number;
}

interface AnalyzeResult {
  succeeded: number;
  failed: number;
  estimatedCost: number;
}

type Busy = "analyze" | "all" | "retry" | null;

// Photos per batch; matches the analyze API's default.
const BATCH_SIZE = 20;

// Progress of the running "Analyze next 20" batch, worked out from the live
// stats: every photo it finishes moves from waiting to analyzed or errors.
interface BatchProgress {
  startFinished: number;
  size: number;
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error("Could not load your photo counts. Check that LoreTree is running, then refresh.");
  return res.json();
}

function formatCost(dollars: number): string {
  return dollars < 0.01 ? "under $0.01" : `about $${dollars.toFixed(2)}`;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [lastResult, setLastResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRef = useRef(false);
  const [batch, setBatch] = useState<BatchProgress | null>(null);

  function refreshStats() {
    fetchStats()
      .then((next) => {
        setStats(next);
        setStatsError(null);
      })
      .catch((err) => setStatsError(err instanceof Error ? err.message : "Could not load your photo counts."));
  }

  useEffect(() => {
    refreshStats();
    return () => {
      stopRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function postAnalyze(body: object): Promise<AnalyzeResult> {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Request failed (${res.status})`);
    }
    return res.json();
  }

  // "analyze" = one batch, "retry" = one batch of failed photos,
  // "all" = batches until nothing is waiting (or Stop is pressed, or a
  // whole batch fails, which means something is wrong and retrying is pointless).
  async function run(mode: Exclude<Busy, null>) {
    setBusy(mode);
    setConfirmAll(false);
    setLastResult(null);
    setError(null);
    stopRef.current = false;
    setBatch(
      stats && mode === "analyze"
        ? { startFinished: stats.analyzed + stats.errors, size: Math.min(BATCH_SIZE, stats.waiting) }
        : null
    );

    pollRef.current = setInterval(() => {
      refreshStats();
    }, 1000);

    const total: AnalyzeResult = { succeeded: 0, failed: 0, estimatedCost: 0 };
    try {
      do {
        const result = await postAnalyze(mode === "retry" ? { retryErrors: true } : {});
        total.succeeded += result.succeeded;
        total.failed += result.failed;
        total.estimatedCost += result.estimatedCost;
        setLastResult({ ...total });
        if (result.succeeded === 0) break;
      } while (mode === "all" && !stopRef.current && (await fetchStats()).waiting > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setBusy(null);
      setBatch(null);
      refreshStats();
    }
  }

  const waiting = stats?.waiting ?? 0;
  const allCost = waiting * (stats?.estimatedCostPerPhoto ?? 0);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 pb-28 pt-10">
      <div className="flex items-center gap-3">
        <Link href="/feed" aria-label="Back to Home" className="text-sm text-text-muted hover:text-text">
          &larr; Back
        </Link>
        <h1 className="text-lg font-medium text-text">Settings</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Imported" value={stats?.imported} />
        <StatTile label="Analyzed" value={stats?.analyzed} />
        <StatTile label="Waiting" value={stats?.waiting} />
        <StatTile label="Errors" value={stats?.errors} />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => run("analyze")}
          disabled={busy !== null || !stats || stats.waiting === 0}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
        >
          {busy === "analyze"
            ? batch && stats
              ? `Analyzing… ${Math.min(batch.size, stats.analyzed + stats.errors - batch.startFinished)} of ${batch.size}`
              : "Analyzing…"
            : `Analyze next ${BATCH_SIZE}`}
        </button>

        {busy === "all" ? (
          <button
            onClick={() => {
              stopRef.current = true;
            }}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text"
          >
            Stop after this batch — {stats?.waiting ?? 0} still waiting
          </button>
        ) : confirmAll ? (
          <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm text-text">
              Analyze all {waiting} waiting photo{waiting === 1 ? "" : "s"}? This uses the Claude API and costs{" "}
              {formatCost(allCost)}. You can stop any time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => run("all")}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-bg"
              >
                Start
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm text-text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmAll(true)}
            disabled={busy !== null || waiting <= BATCH_SIZE}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text transition-opacity disabled:opacity-40"
          >
            {waiting > BATCH_SIZE ? `Analyze all ${waiting} waiting` : "Analyze all waiting"}
          </button>
        )}

        <button
          onClick={() => run("retry")}
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
      {statsError && <p className="text-sm text-node-events">{statsError}</p>}

      {stats && stats.errorReasons.length > 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="mb-2 text-xs font-medium text-text">Why photos failed</p>
          <ul className="flex flex-col gap-1.5">
            {stats.errorReasons.map((r) => (
              <li key={r.reason} className="text-xs text-text-muted">
                <span className="text-text">{r.count}×</span> {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

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
