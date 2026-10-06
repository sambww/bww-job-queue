import { chicagoCalendarDate } from "../chicagoTime";

/** Statuses that still appear on the public board. */
export const BOARD_OPEN_STATUSES = new Set(["queued", "active", "unassigned"]);

export function shouldCloseMissingWorkizJob(input: {
  pullComplete: boolean;
  seenWorkizIds: ReadonlySet<string>;
  workizId: string | null;
  status: string;
  estimatedStartDate: Date | null;
  pullStartDate: string;
}): boolean {
  if (!input.pullComplete || input.seenWorkizIds.size === 0) return false;
  if (!input.workizId || input.seenWorkizIds.has(input.workizId)) return false;
  if (!BOARD_OPEN_STATUSES.has(input.status)) return false;
  if (input.estimatedStartDate) {
    const scheduled = chicagoCalendarDate(input.estimatedStartDate);
    if (scheduled < input.pullStartDate) return false;
  }
  return true;
}
