"use client";

import { FormEvent, useState } from "react";

type Mapping = {
  id: string;
  matchType: string;
  matchValue: string;
  rigId: string;
};

export function MappingsAdmin({
  initial,
  rigs,
}: {
  initial: Mapping[];
  rigs: Array<{ id: string; name: string }>;
}) {
  const [mappings, setMappings] = useState(initial);
  const [matchType, setMatchType] = useState("tag");
  const [matchValue, setMatchValue] = useState("");
  const [rigId, setRigId] = useState(rigs[0]?.id ?? "");
  const [error, setError] = useState("");

  async function refresh() {
    const response = await fetch("/api/mappings", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as { mappings: Mapping[] };
      setMappings(data.mappings);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchType, matchValue, rigId }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Could not save mapping");
      return;
    }
    setMatchValue("");
    await refresh();
  }

  async function remove(id: string) {
    const response = await fetch(`/api/mappings/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Delete failed");
      return;
    }
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Workiz → rig mappings</h2>
        <p className="mt-1 text-sm text-muted">
          Match a Workiz tag or supervisor name to a BWW rig. Tag matches win first. Tags are
          normalized with <code className="font-mono text-cyan">asTagList</code> so string or object
          payloads never crash sync.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-line bg-panel p-5 md:grid-cols-4">
        <label className="text-sm text-muted">
          Match type
          <select
            value={matchType}
            onChange={(event) => setMatchType(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
          >
            <option value="tag">Tag</option>
            <option value="supervisor">Supervisor name</option>
          </select>
        </label>
        <label className="text-sm text-muted md:col-span-2">
          Match value
          <input
            value={matchValue}
            onChange={(event) => setMatchValue(event.target.value)}
            placeholder={matchType === "tag" ? "Rig 1" : "Sam Ballard"}
            className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
          />
        </label>
        <label className="text-sm text-muted">
          Rig
          <select
            value={rigId}
            onChange={(event) => setRigId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-paper"
          >
            {rigs.map((rig) => (
              <option key={rig.id} value={rig.id}>
                {rig.name}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-4">
          {error ? <p className="mb-2 text-sm text-bad">{error}</p> : null}
          <button type="submit" className="rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-ink">
            Add mapping
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Value</th>
              <th className="px-3 py-3">Rig</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.id} className="border-t border-line/80">
                <td className="px-3 py-3 capitalize">{mapping.matchType}</td>
                <td className="px-3 py-3 font-mono text-xs">{mapping.matchValue}</td>
                <td className="px-3 py-3">{rigs.find((rig) => rig.id === mapping.rigId)?.name ?? mapping.rigId}</td>
                <td className="px-3 py-3 text-right">
                  <button type="button" onClick={() => void remove(mapping.id)} className="text-xs text-bad">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {mappings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-muted">
                  No mappings yet. Sync will still import jobs as unassigned.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
