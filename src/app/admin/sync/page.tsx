import { SyncAdmin } from "@/components/admin/SyncAdmin";
import { isDatabaseConfigured } from "@/lib/db";
import { latestSyncRuns } from "@/lib/workiz/sync";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sand">Set DATABASE_URL to view sync status.</p>;
  }
  const runs = await latestSyncRuns();
  return (
    <SyncAdmin
      initialRuns={runs.map((run) => ({
        ...run,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt?.toISOString() ?? null,
      }))}
    />
  );
}
