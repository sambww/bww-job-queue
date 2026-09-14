import { describe, expect, it } from "vitest";
import { workizErrorMessage } from "./client";

describe("workizErrorMessage", () => {
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
