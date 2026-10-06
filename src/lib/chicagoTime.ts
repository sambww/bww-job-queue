export const CHICAGO_TZ = "America/Chicago";

export type WallTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

const OFFSET_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const WALL_CLOCK =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;

function tzOffsetMs(timeZone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - utcMs;
}

/** Convert an America/Chicago wall-clock time to a UTC instant, including DST. */
export function chicagoWallTimeToUtc(parts: WallTimeParts): Date {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  );
  let utc = utcGuess - tzOffsetMs(CHICAGO_TZ, utcGuess);
  utc = utcGuess - tzOffsetMs(CHICAGO_TZ, utc);
  return new Date(utc);
}

/**
 * Parse a Workiz job datetime.
 *
 * The published schema example is an absolute ISO instant (`2016-08-29T09:12:33.001Z`).
 * The live list payload that this app already normalizes is an account-local
 * `YYYY-MM-DD HH:mm:ss` with no offset. Those wall times are America/Chicago.
 * Strings that already carry `Z` or a numeric offset are kept as absolute instants.
 */
export function parseWorkizDateTime(raw: string | null | undefined): Date | null {
  if (raw == null) return null;
  const text = raw.trim();
  if (!text) return null;

  if (OFFSET_SUFFIX.test(text)) {
    const absolute = new Date(text);
    return Number.isNaN(absolute.getTime()) ? null : absolute;
  }

  const match = WALL_CLOCK.exec(text);
  if (!match) return null;

  const fraction = match[7] ? match[7].padEnd(3, "0") : "0";
  return chicagoWallTimeToUtc({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] !== undefined ? Number(match[4]) : 0,
    minute: match[5] !== undefined ? Number(match[5]) : 0,
    second: match[6] !== undefined ? Number(match[6]) : 0,
    millisecond: Number(fraction),
  });
}

/**
 * Rows synced before the parser fix stored the Chicago wall clock as if it were UTC.
 * Re-read those UTC fields as America/Chicago. Idempotent only when applied once.
 */
export function reinterpretUtcWallClockAsChicago(value: Date): Date {
  return chicagoWallTimeToUtc({
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    hour: value.getUTCHours(),
    minute: value.getUTCMinutes(),
    second: value.getUTCSeconds(),
    millisecond: value.getUTCMilliseconds(),
  });
}

/** Calendar date of an instant in America/Chicago, `YYYY-MM-DD`. */
export function chicagoCalendarDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHICAGO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
