import { statusLabel } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`status-${status} inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize tracking-wide`}
    >
      {statusLabel(status)}
    </span>
  );
}
