import { CHICAGO_TZ } from "./chicagoTime";

function asDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "TBD";
  return date.toLocaleDateString("en-US", {
    timeZone: CHICAGO_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "Never";
  return date.toLocaleString("en-US", {
    timeZone: CHICAGO_TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Scheduled job start as a Chicago wall time, including CDT/CST. */
export function formatJobStart(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "TBD";
  return date.toLocaleString("en-US", {
    timeZone: CHICAGO_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** `YYYY-MM-DD` in America/Chicago for the admin date input. */
export function formatDateInput(value: string | Date | null | undefined) {
  const date = asDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}
