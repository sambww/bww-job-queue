"use client";

import { useMemo, useState } from "react";
import { JobCard } from "@/components/JobCard";
import type { BoardJob, BoardPayload } from "@/lib/board";

export function QueueManager({ initial }: { initial: BoardPayload }) {
  const [board, setBoard] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const columns = useMemo(
    () => [
      ...board.rigs.map((rig) => ({ id: rig.id, title: rig.name, jobs: rig.jobs })),
      { id: "", title: "Unassigned", jobs: board.unassigned },
    ],
    [board],
  );

  async function refresh() {
    const response = await fetch("/api/public/board", { cache: "no-store" });
    if (response.ok) {
      setBoard((await response.json()) as BoardPayload);
    }
  }

  async function patchJob(jobId: string, payload: Record<string, unknown>) {
    setBusy(jobId);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Update failed");
      return;
    }
    await refresh();
  }

  async function reorder(rigId: string, jobIds: string[]) {
    setBusy(rigId || "unassigned");
    setError("");
    const response = await fetch("/api/jobs/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rigId: rigId || null, jobIds }),
    });
    setBusy(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Reorder failed");
      return;
    }
    await refresh();
  }

  function move(jobs: BoardJob[], index: number, direction: -1 | 1, rigId: string) {
    const next = index + direction;
    if (next < 0 || next >= jobs.length) return;
    const ids = jobs.map((job) => job.id);
    const [removed] = ids.splice(index, 1);
    ids.splice(next, 0, removed);
    void reorder(rigId, ids);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Active queues</h2>
          <p className="text-sm text-muted">Reorder within a rig. Assign a rig or supervisor without losing queue order on Workiz sync.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-cyan/50"
        >
          Refresh
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-bad">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {columns.map((column) => (
          <section key={column.id || "unassigned"} className="rounded-2xl border border-line bg-ink-soft/70 p-4">
            <div className="mb-4 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">{column.title}</h3>
              <span className="font-mono text-xs text-muted">{column.jobs.length}</span>
            </div>
            <div className="space-y-3">
              {column.jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={busy !== null || index === 0}
                        onClick={() => move(column.jobs, index, -1, column.id)}
                        className="rounded-md border border-line px-2 py-1 text-xs disabled:opacity-40"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null || index === column.jobs.length - 1}
                        onClick={() => move(column.jobs, index, 1, column.id)}
                        className="rounded-md border border-line px-2 py-1 text-xs disabled:opacity-40"
                      >
                        Down
                      </button>
                      <select
                        className="rounded-md border border-line bg-ink px-2 py-1 text-xs"
                        value={job.rigId ?? ""}
                        disabled={busy !== null}
                        onChange={(event) => void patchJob(job.id, { rigId: event.target.value || null })}
                      >
                        <option value="">No rig</option>
                        {board.rigs.map((rig) => (
                          <option key={rig.id} value={rig.id}>
                            {rig.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-line bg-ink px-2 py-1 text-xs"
                        value={job.supervisorId ?? ""}
                        disabled={busy !== null}
                        onChange={(event) =>
                          void patchJob(job.id, {
                            supervisorId: event.target.value || null,
                            supervisorName:
                              board.supervisors.find((item) => item.id === event.target.value)?.name ?? null,
                          })
                        }
                      >
                        <option value="">No supervisor</option>
                        {board.supervisors.map((supervisor) => (
                          <option key={supervisor.id} value={supervisor.id}>
                            {supervisor.name}
                          </option>
                        ))}
                      </select>
                    </>
                  }
                />
              ))}
              {column.jobs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
                  Empty queue
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
