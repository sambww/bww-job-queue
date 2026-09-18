import { afterEach, describe, expect, it } from "vitest";
import {
  applyWorkizQueryAuth,
  buildJobAllQuery,
  isWorkizEasyApiMode,
  workizErrorMessage,
  workizLookbackDays,
  workizStartDate,
} from "./client";

describe("workizErrorMessage", () => {
  it("surfaces the full live Workiz 403 JSON body (error + message, no data)", () => {
    const body = {
      success: false,
      error: "Forbidden",
      message: "Invalid API path or malformed API key.",
    };
    expect(workizErrorMessage(403, body)).toBe(`Workiz HTTP 403: ${JSON.stringify(body)}`);
  });

  it("surfaces the full official Error schema (flag/code/data)", () => {
    const body = { flag: false, code: 400, data: "bad input parameter" };
    expect(workizErrorMessage(400, body)).toBe(`Workiz HTTP 400: ${JSON.stringify(body)}`);
  });

  it("surfaces a data-only payload as full JSON", () => {
    expect(workizErrorMessage(400, { data: "Invalid API token" })).toBe(
      'Workiz HTTP 400: {"data":"Invalid API token"}',
    );
  });

  it("surfaces error and message fields inside the JSON body", () => {
    expect(workizErrorMessage(401, { error: "Unauthorized" })).toBe(
      'Workiz HTTP 401: {"error":"Unauthorized"}',
    );
    expect(workizErrorMessage(400, { message: "Bad request" })).toBe(
      'Workiz HTTP 400: {"message":"Bad request"}',
    );
  });

  it("stringifies structured error payloads", () => {
    expect(workizErrorMessage(400, { errors: ["start_date invalid"] })).toBe(
      'Workiz HTTP 400: {"errors":["start_date invalid"]}',
    );
  });

  it("falls back to the raw body when JSON has no known error field", () => {
    expect(workizErrorMessage(400, null, "<html>Bad Request</html>")).toBe(
      "Workiz HTTP 400: <html>Bad Request</html>",
    );
  });

  it("truncates very long raw bodies", () => {
    const long = "x".repeat(1500);
    const result = workizErrorMessage(500, null, long);
    expect(result.startsWith("Workiz HTTP 500: ")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThan(1040);
  });

  it("returns a bare status when no detail is available", () => {
    expect(workizErrorMessage(400, null)).toBe("Workiz HTTP 400");
    expect(workizErrorMessage(400, {})).toBe("Workiz HTTP 400");
  });
});

describe("workizStartDate", () => {
  it("formats a YYYY-MM-DD date `days` before the reference time", () => {
    const now = new Date("2026-09-18T03:30:00.000Z");
    expect(workizStartDate(14, now)).toBe("2026-09-04");
    expect(workizStartDate(730, now)).toBe("2024-09-18");
  });
});

describe("workizLookbackDays", () => {
  const original = process.env.WORKIZ_LOOKBACK_DAYS;
  afterEach(() => {
    if (original === undefined) delete process.env.WORKIZ_LOOKBACK_DAYS;
    else process.env.WORKIZ_LOOKBACK_DAYS = original;
  });

  it("defaults to 730 (~2 years) when unset or invalid", () => {
    delete process.env.WORKIZ_LOOKBACK_DAYS;
    expect(workizLookbackDays()).toBe(730);
    process.env.WORKIZ_LOOKBACK_DAYS = "0";
    expect(workizLookbackDays()).toBe(730);
    process.env.WORKIZ_LOOKBACK_DAYS = "not-a-number";
    expect(workizLookbackDays()).toBe(730);
  });

  it("honors a positive override", () => {
    process.env.WORKIZ_LOOKBACK_DAYS = "30";
    expect(workizLookbackDays()).toBe(30);
  });
});

describe("buildJobAllQuery + Easy API secret", () => {
  const originalSecret = process.env.WORKIZ_AUTH_SECRET;
  const originalLookback = process.env.WORKIZ_LOOKBACK_DAYS;
  const originalMode = process.env.WORKIZ_API_MODE;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.WORKIZ_AUTH_SECRET;
    else process.env.WORKIZ_AUTH_SECRET = originalSecret;
    if (originalLookback === undefined) delete process.env.WORKIZ_LOOKBACK_DAYS;
    else process.env.WORKIZ_LOOKBACK_DAYS = originalLookback;
    if (originalMode === undefined) delete process.env.WORKIZ_API_MODE;
    else process.env.WORKIZ_API_MODE = originalMode;
  });

  it("always includes start_date ~2y ago plus only_open, records, offset", () => {
    delete process.env.WORKIZ_LOOKBACK_DAYS;
    delete process.env.WORKIZ_API_MODE;
    const query = buildJobAllQuery({
      records: 100,
      offset: 0,
      now: new Date("2026-09-18T03:30:00.000Z"),
    });
    expect(query).toEqual({
      records: "100",
      offset: "0",
      start_date: "2024-09-18",
      only_open: "true",
    });
  });

  it("does not attach secret= on Developer API even when WORKIZ_AUTH_SECRET is set", () => {
    delete process.env.WORKIZ_API_MODE;
    process.env.WORKIZ_AUTH_SECRET = "should-not-appear";
    const query = buildJobAllQuery({
      records: 500,
      offset: 20,
      now: new Date("2026-09-18T00:00:00.000Z"),
    });
    expect(query.records).toBe("100");
    expect(query).not.toHaveProperty("secret");
    expect(applyWorkizQueryAuth({ records: "1" })).toEqual({ records: "1" });
    expect(isWorkizEasyApiMode()).toBe(false);
  });

  it("attaches secret= only in Easy API mode when the secret is set", () => {
    process.env.WORKIZ_API_MODE = "easy";
    process.env.WORKIZ_AUTH_SECRET = "easy-secret";
    expect(isWorkizEasyApiMode()).toBe(true);
    expect(applyWorkizQueryAuth({ records: "1" })).toEqual({
      records: "1",
      secret: "easy-secret",
    });
    const query = buildJobAllQuery({
      records: 1,
      offset: 0,
      now: new Date("2026-09-18T00:00:00.000Z"),
    });
    expect(query.secret).toBe("easy-secret");
    expect(query.start_date).toBe("2024-09-18");
  });
});
