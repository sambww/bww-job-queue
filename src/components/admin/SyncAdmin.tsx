"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";

type SyncRun = {
  id: string;
  startedAt: string | Date;
  finishedAt: string | Date | null;
  status: string;
  message: string;
  jobsPulled: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsUnmapped: number;
};

export function SyncAdmin({ initialRuns }: { initialRuns: SyncRun[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const [ping, setPing] = useState<string>("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<"ping" | "sync" | null>(null);

  async function refresh() {
    const response = await fetch("/api/workiz/sync", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { runs: SyncRun[] };
      setRuns(data.runs);
    }
  }

  async function pingWorkiz() {
    setPending("ping");
    setMessage("");
    const response = await fetch("/api/workiz/ping", { method: "POST" });
    const data = (await response.json().catch(() => null)) as
      | { latencyMs?: number; error?: string; sampleCount?: number }
      | null;
    setPending(null);
    if (!response.ok) {
      setPing(data?.error ?? "Ping failed");
      return;
    }
    setPing(`Reachable in ${data?.latencyMs ?? "?"}ms · sample ${data?.sampleCount ?? 0}`);
  }

  async function runSync() {
    setPending("sync");
    setMessage("");
    const response = await fetch("/api/workiz/sync", { method: "POST" });
    const data = (await response.json().catch(() => null)) as
      | { error?: string; jobsPulled?: number; jobsCreated?: number; jobsUpdated?: number }
      | null;
    setPending(null);
    if (!response.ok) {
      setMessage(data?.error ?? "Sync failed");
      await refresh();
      return;
    }
    setMessage(
      `Synced ${data?.jobsPulled ?? 0} open jobs (${data?.jobsCreated ?? 0} new, ${data?.jobsUpdated ?? 0} updated).`,
    );
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Workiz Easy Live Sync</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Pulls open Workiz jobs every 15 minutes via Vercel Cron. Mapping is by tag, then supervisor
          name. Existing rows are updated in place and keep the queue order an admin set.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void pingWorkiz()}
          disabled={pending !== null}
          className="rounded-lg border border-line px-4 py-2 text-sm hover:border-cyan/50 disabled:opacity-60"
        >
          {pending === "ping" ? "Pinging…" : "Ping Workiz"}
        </button>
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={pending !== null}
          className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          {pending === "sync" ? "Syncing…" : "Run sync now"}
        </button>
      </div>
      {ping ? <p className="text-sm text-sand">{ping}</p> : null}
      {message ? <p className="text-sm text-good">{message}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Pulled</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3">Unmapped</th>
              <th className="px-3 py-3">Message</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t border-line/80">
                <td className="px-3 py-3 text-xs">{formatDateTime(run.startedAt)}</td>
                <td className="px-3 py-3 capitalize">{run.status}</td>
                <td className="px-3 py-3">{run.jobsPulled}</td>
                <td className="px-3 py-3">{run.jobsCreated}</td>
                <td className="px-3 py-3">{run.jobsUpdated}</td>
                <td className="px-3 py-3">{run.jobsUnmapped}</td>
                <td className="px-3 py-3 text-xs text-muted">{run.message}</td>
              </tr>
            ))}
            {runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted">
                  No sync runs recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
