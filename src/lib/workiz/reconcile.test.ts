import { describe, expect, it } from "vitest";
import { shouldCloseMissingWorkizJob } from "./reconcile";

const seen = new Set(["open-1", "open-2"]);

function decide(
  overrides: Partial<Parameters<typeof shouldCloseMissingWorkizJob>[0]> = {},
) {
  return shouldCloseMissingWorkizJob({
    pullComplete: true,
    seenWorkizIds: seen,
    workizId: "stale-1",
    status: "unassigned",
    estimatedStartDate: new Date("2026-10-08T15:00:00.000Z"),
    pullStartDate: "2024-10-06",
    ...overrides,
  });
}

describe("shouldCloseMissingWorkizJob", () => {
  it("closes a board job that a complete open pull did not return", () => {
    expect(decide()).toBe(true);
    expect(decide({ status: "queued" })).toBe(true);
    expect(decide({ status: "active" })).toBe(true);
  });

  it("does not close jobs still present in the pull", () => {
    expect(decide({ workizId: "open-1" })).toBe(false);
  });

  it("does not close anything when the pull failed, stopped early, or was empty", () => {
    expect(decide({ pullComplete: false })).toBe(false);
    expect(decide({ seenWorkizIds: new Set() })).toBe(false);
  });

  it("leaves manual jobs and jobs already off the board alone", () => {
    expect(decide({ workizId: null })).toBe(false);
    expect(decide({ status: "completed" })).toBe(false);
    expect(decide({ status: "cancelled" })).toBe(false);
  });

  it("does not treat jobs scheduled before the pull window as closed", () => {
    expect(
      decide({
        estimatedStartDate: new Date("2024-01-15T14:00:00.000Z"),
        pullStartDate: "2024-10-06",
      }),
    ).toBe(false);
  });

  it("closes a missing job that has no start time", () => {
    expect(decide({ estimatedStartDate: null })).toBe(true);
  });
});
