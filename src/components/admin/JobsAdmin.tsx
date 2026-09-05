"use client";

import { FormEvent, useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import type { BoardJob } from "@/lib/board";
import { formatDate } from "@/lib/format";
import { JOB_STATUSES } from "@/lib/jobFields";

type RigOption = { id: string; name: string };
type SupervisorOption = { id: string; name: string };

const EMPTY_FORM = {
  jobCode: "",
  customerName: "",
  address: "",
  jobType: "",
  description: "",
  estimatedStartDate: "",
  status: "queued",
  rigId: "",
  supervisorId: "",
  supervisorName: "",
  customerEmail: "",
  customerPhone: "",
  customerNotifyOptIn: false,
};

export function JobsAdmin({
  initialJobs,
  rigs,
  supervisors,
}: {
  initialJobs: BoardJob[];
  rigs: RigOption[];
  supervisors: SupervisorOption[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const title = editingId ? "Edit job" : "Add job";

  const supervisorName = useMemo(
    () => supervisors.find((item) => item.id === form.supervisorId)?.name ?? form.supervisorName,
    [form.supervisorId, form.supervisorName, supervisors],
  );

  function startEdit(job: BoardJob) {
    setEditingId(job.id);
    setForm({
      jobCode: job.jobCode,
      customerName: job.customerName,
      address: job.address,
      jobType: job.jobType,
      description: job.description,
      estimatedStartDate: job.estimatedStartDate ? job.estimatedStartDate.slice(0, 10) : "",
      status: job.status,
      rigId: job.rigId ?? "",
      supervisorId: job.supervisorId ?? "",
      supervisorName: job.supervisorName ?? "",
      customerEmail: job.customerEmail ?? "",
      customerPhone: job.customerPhone ?? "",
      customerNotifyOptIn: job.customerNotifyOptIn,
    });
  }

  async function refresh() {
    const response = await fetch("/api/jobs", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { jobs: BoardJob[] };
    setJobs(
      data.jobs.map((job) => ({
        ...job,
        estimatedStartDate: job.estimatedStartDate,
        createdAt: String(job.createdAt),
        updatedAt: String(job.updatedAt),
      })),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = {
      ...form,
      rigId: form.rigId || null,
      supervisorId: form.supervisorId || null,
      supervisorName: supervisorName || null,
      estimatedStartDate: form.estimatedStartDate || null,
    };
    const response = await fetch(editingId ? `/api/jobs/${editingId}` : "/api/jobs", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPending(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Save failed");
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this job?")) return;
    const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Delete failed");
      return;
    }
    if (editingId === id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    await refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-4 space-y-3">
          {(
            [
              ["jobCode", "Job code", "text"],
              ["customerName", "Customer", "text"],
              ["address", "Address", "text"],
              ["jobType", "Job type", "text"],
              ["estimatedStartDate", "Estimated start", "date"],
              ["customerEmail", "Customer email", "email"],
              ["customerPhone", "Customer phone", "tel"],
              ["supervisorName", "Supervisor name", "text"],
            ] as const
          ).map(([key, label, type]) => (
            <label key={key} className="block text-sm text-muted">
              {label}
              <input
                type={type}
                value={form[key] as string}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
              />
            </label>
          ))}
          <label className="block text-sm text-muted">
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="mt-1 min-h-20 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
            />
          </label>
          <label className="block text-sm text-muted">
            Status
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
            >
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            Rig
            <select
              value={form.rigId}
              onChange={(event) => setForm((current) => ({ ...current, rigId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
            >
              <option value="">Unassigned</option>
              {rigs.map((rig) => (
                <option key={rig.id} value={rig.id}>
                  {rig.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            Supervisor
            <select
              value={form.supervisorId}
              onChange={(event) => setForm((current) => ({ ...current, supervisorId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
            >
              <option value="">None</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.customerNotifyOptIn}
              onChange={(event) =>
                setForm((current) => ({ ...current, customerNotifyOptIn: event.target.checked }))
              }
            />
            Customer notify opt-in
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
          >
            {pending ? "Saving…" : editingId ? "Save changes" : "Create job"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-line px-4 py-2 text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">Job</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Rig / Supervisor</th>
              <th className="px-3 py-3">Start</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-line/80">
                <td className="px-3 py-3 font-mono text-xs text-cyan">{job.jobCode}</td>
                <td className="px-3 py-3">
                  <div className="font-medium">{job.customerName}</div>
                  <div className="text-xs text-muted">{job.address}</div>
                </td>
                <td className="px-3 py-3 text-xs text-muted">
                  <div>{rigs.find((rig) => rig.id === job.rigId)?.name ?? "Unassigned"}</div>
                  <div>{job.supervisorName || "—"}</div>
                </td>
                <td className="px-3 py-3 text-xs">{formatDate(job.estimatedStartDate)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-3 py-3 text-right">
                  <button type="button" onClick={() => startEdit(job)} className="mr-2 text-xs text-cyan">
                    Edit
                  </button>
                  <button type="button" onClick={() => void remove(job.id)} className="text-xs text-bad">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  No jobs yet. Create one or run Workiz sync.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
