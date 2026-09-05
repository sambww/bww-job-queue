import { JobCard } from "@/components/JobCard";
import { SiteHeader } from "@/components/SiteHeader";
import { getBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await getBoard();
  const columns = [
    ...board.rigs.map((rig) => ({
      id: rig.id,
      title: rig.name,
      jobs: rig.jobs,
    })),
    ...(board.unassigned.length
      ? [{ id: "unassigned", title: "Unassigned", jobs: board.unassigned }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader lastSyncAt={board.lastSyncAt} lastSyncStatus={board.lastSyncStatus} />
      <main className="mx-auto max-w-[1500px] px-5 py-6">
        {!board.databaseConfigured ? (
          <div className="mb-5 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-sand">
            Database is not configured. Set <code className="font-mono">DATABASE_URL</code> to load
            live rig queues.
          </div>
        ) : null}

        {columns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
            <p className="text-lg font-medium">No active rigs yet</p>
            <p className="mt-2 text-sm text-muted">
              Seeded rigs appear after the database is connected. Open jobs land here from Workiz
              sync or admin entry.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {columns.map((column) => (
              <section key={column.id} className="rounded-2xl border border-line/80 bg-ink-soft/70 p-4">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold">{column.title}</h2>
                  <span className="font-mono text-xs text-muted">{column.jobs.length} queued</span>
                </div>
                <div className="space-y-3">
                  {column.jobs.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm text-muted">
                      Clear — no jobs in queue
                    </p>
                  ) : (
                    column.jobs.map((job) => <JobCard key={job.id} job={job} />)
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
