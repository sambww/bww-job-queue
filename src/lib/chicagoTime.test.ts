import { describe, expect, it } from "vitest";
import {
  chicagoCalendarDate,
  parseWorkizDateTime,
  reinterpretUtcWallClockAsChicago,
} from "./chicagoTime";

describe("parseWorkizDateTime", () => {
  it("treats offset-less Workiz local datetimes as America/Chicago wall time", () => {
    expect(parseWorkizDateTime("2026-07-15 08:00:00")?.toISOString()).toBe("2026-07-15T13:00:00.000Z");
    expect(parseWorkizDateTime("2026-01-15 08:00:00")?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    expect(parseWorkizDateTime("2026-10-08T10:00:00")?.toISOString()).toBe("2026-10-08T15:00:00.000Z");
  });

  it("keeps documented absolute ISO instants unchanged", () => {
    expect(parseWorkizDateTime("2016-08-29T09:12:33.001Z")?.toISOString()).toBe(
      "2016-08-29T09:12:33.001Z",
    );
    expect(parseWorkizDateTime("2026-07-15T13:00:00-05:00")?.toISOString()).toBe(
      "2026-07-15T18:00:00.000Z",
    );
  });

  it("uses Chicago midnight for a date-only value and follows DST", () => {
    expect(parseWorkizDateTime("2026-07-15")?.toISOString()).toBe("2026-07-15T05:00:00.000Z");
    expect(parseWorkizDateTime("2026-01-15")?.toISOString()).toBe("2026-01-15T06:00:00.000Z");
    expect(parseWorkizDateTime("2026-03-08 03:00:00")?.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(parseWorkizDateTime("2026-11-01 08:00:00")?.toISOString()).toBe("2026-11-01T14:00:00.000Z");
  });

  it("returns null for empty or unparseable values", () => {
    expect(parseWorkizDateTime(null)).toBeNull();
    expect(parseWorkizDateTime("  ")).toBeNull();
    expect(parseWorkizDateTime("next tuesday")).toBeNull();
  });
});

describe("reinterpretUtcWallClockAsChicago", () => {
  it("shifts a UTC-stored wall clock onto the Chicago instant for that date", () => {
    const stored = new Date("2026-10-08T10:00:00.000Z");
    expect(reinterpretUtcWallClockAsChicago(stored).toISOString()).toBe("2026-10-08T15:00:00.000Z");
    expect(chicagoCalendarDate(reinterpretUtcWallClockAsChicago(stored))).toBe("2026-10-08");

    const winter = new Date("2026-01-15T08:00:00.000Z");
    expect(reinterpretUtcWallClockAsChicago(winter).toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });
});
