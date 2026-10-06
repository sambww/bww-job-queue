import { describe, expect, it } from "vitest";
import { formatDate, formatDateInput, formatDateTime, formatJobStart } from "./format";

describe("Chicago display", () => {
  const instant = "2026-10-08T15:00:00.000Z";

  it("shows the Chicago calendar date and clock time, including the daylight abbreviation", () => {
    expect(formatDate(instant)).toBe("Oct 8, 2026");
    expect(formatJobStart(instant)).toBe("Oct 8, 2026, 10:00 AM CDT");
    expect(formatDateInput(instant)).toBe("2026-10-08");
  });

  it("uses standard time in January", () => {
    expect(formatJobStart("2026-01-15T14:00:00.000Z")).toBe("Jan 15, 2026, 8:00 AM CST");
  });

  it("formats sync timestamps in Chicago without changing empty copy", () => {
    expect(formatDateTime("2026-10-08T15:00:00.000Z")).toBe("Oct 8, 10:00 AM");
    expect(formatDate(null)).toBe("TBD");
    expect(formatJobStart(null)).toBe("TBD");
    expect(formatDateTime(null)).toBe("Never");
    expect(formatDateInput(null)).toBe("");
  });
});
