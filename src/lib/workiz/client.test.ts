import { afterEach, describe, expect, it } from "vitest";
import {
  buildJobAllQuery,
  workizErrorMessage,
  workizLookbackDays,
  workizStartDate,
} from "./client";

describe("workizErrorMessage", () => {
  it("surfaces the live Workiz 403 shape (error + message, no data)", () => {
    expect(
      workizErrorMessage(403, {
        success: false,
        error: "Forbidden",
        message: "Invalid API path or malformed API key.",
      }),
    ).toBe("Workiz HTTP 403: Invalid API path or malformed API key.; Forbidden");
  });

  it("surfaces flag/code/data from the official Error schema", () => {
    expect(
      workizErrorMessage(400, {
        flag: false,
        code: 400,
        data: "bad input parameter",
      }),
    ).toBe("Workiz HTTP 400: code=400; flag=false; bad input parameter");
  });

  it("surfaces the detail from the `data` field (legacy shape)", () => {
    expect(workizErrorMessage(400, { data: "Invalid API token" })).toBe(
      "Workiz HTTP 400: Invalid API token",
    );
  });

  it("surfaces `error` and `message` fields", () => {
    expect(workizErrorMessage(401, { error: "Unauthorized" })).toBe(
      "Workiz HTTP 401: Unauthorized",
    );
    expect(workizErrorMessage(400, { message: "Bad request" })).toBe(
      "Workiz HTTP 400: Bad request",
    );
  });

  it("stringifies structured error payloads", () => {
    expect(workizErrorMessage(400, { errors: ["start_date invalid"] })).toBe(
      'Workiz HTTP 400: ["start_date invalid"]',
    );
  });

  it("falls back to the raw body when JSON has no known error field", () => {
    expect(workizErrorMessage(400, null, "<html>Bad Request</html>")).toBe(
      "Workiz HTTP 400: <html>Bad Request</html>",
    );
  });

  it("truncates very long raw bodies", () => {
    const long = "x".repeat(500);
    const result = workizErrorMessage(500, null, long);
    expect(result.startsWith("Workiz HTTP 500: ")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThan(360);
  });

  it("returns a bare status when no detail is available", () => {
    expect(workizErrorMessage(400, null)).toBe("Workiz HTTP 400");
    expect(workizErrorMessage(400, {})).toBe("Workiz HTTP 400");
    expect(workizErrorMessage(400, { data: {} })).toBe("Workiz HTTP 400");
  });
});

describe("workizStartDate", () => {
  it("formats a YYYY-MM-DD date `days` before the reference time", () => {
    const now = new Date("2026-09-18T03:30:00.000Z");
    expect(workizStartDate(14, now)).toBe("2026-09-04");
    expect(workizStartDate(365, now)).toBe("2025-09-18");
  });
});

describe("workizLookbackDays", () => {
  const original = process.env.WORKIZ_LOOKBACK_DAYS;
  afterEach(() => {
    if (original === undefined) delete process.env.WORKIZ_LOOKBACK_DAYS;
    else process.env.WORKIZ_LOOKBACK_DAYS = original;
  });

  it("defaults to 365 when unset or invalid", () => {
    delete process.env.WORKIZ_LOOKBACK_DAYS;
    expect(workizLookbackDays()).toBe(365);
    process.env.WORKIZ_LOOKBACK_DAYS = "0";
    expect(workizLookbackDays()).toBe(365);
    process.env.WORKIZ_LOOKBACK_DAYS = "not-a-number";
    expect(workizLookbackDays()).toBe(365);
  });

  it("honors a positive override", () => {
    process.env.WORKIZ_LOOKBACK_DAYS = "30";
    expect(workizLookbackDays()).toBe(30);
  });
});

describe("buildJobAllQuery", () => {
  const originalSecret = process.env.WORKIZ_AUTH_SECRET;
  const originalLookback = process.env.WORKIZ_LOOKBACK_DAYS;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.WORKIZ_AUTH_SECRET;
    else process.env.WORKIZ_AUTH_SECRET = originalSecret;
    if (originalLookback === undefined) delete process.env.WORKIZ_LOOKBACK_DAYS;
    else process.env.WORKIZ_LOOKBACK_DAYS = originalLookback;
  });

  it("matches the documented Developer API job/all params", () => {
    delete process.env.WORKIZ_LOOKBACK_DAYS;
    const query = buildJobAllQuery({
      records: 100,
      offset: 0,
      now: new Date("2026-09-18T03:30:00.000Z"),
    });
    expect(query).toEqual({
      records: "100",
      offset: "0",
      start_date: "2025-09-18",
      only_open: "true",
    });
  });

  it("caps records at 100 and never attaches secret=", () => {
    process.env.WORKIZ_AUTH_SECRET = "should-not-appear";
    const query = buildJobAllQuery({
      records: 500,
      offset: 20,
      now: new Date("2026-09-18T00:00:00.000Z"),
    });
    expect(query.records).toBe("100");
    expect(query.offset).toBe("20");
    expect(query).not.toHaveProperty("secret");
    expect(query).not.toHaveProperty("auth_secret");
    expect(Object.keys(query).sort()).toEqual(["offset", "only_open", "records", "start_date"]);
  });
});
