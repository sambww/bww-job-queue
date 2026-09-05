import Link from "next/link";

export function SiteHeader({
  lastSyncAt,
  lastSyncStatus,
  adminHref = "/login",
}: {
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  adminHref?: string;
}) {
  return (
    <header className="border-b border-line/80 bg-ink-soft/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan/15 font-mono text-sm font-semibold text-cyan">
            BWW
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Ballard Water Well / Texas Water Well</p>
            <h1 className="text-lg font-semibold tracking-tight">Job Queue Dashboard</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="hidden text-right text-xs text-muted sm:block">
            <p>Workiz Easy Live Sync</p>
            <p>
              {lastSyncStatus ? `${lastSyncStatus} · ` : ""}
              {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "Awaiting first sync"}
            </p>
          </div>
          <Link
            href={adminHref}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-paper hover:border-cyan/50 hover:text-cyan"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
