import { describe, expect, it } from "vitest";
import { asTagList } from "./asTagList";

describe("asTagList", () => {
  it("returns string values from an array", () => {
    expect(asTagList(["Rig 1", "Priority", ""])).toEqual(["Rig 1", "Priority"]);
    expect(asTagList([1, "East"])).toEqual(["1", "East"]);
  });

  it("wraps a non-empty string", () => {
    expect(asTagList("Rig 2")).toEqual(["Rig 2"]);
    expect(asTagList("  Pump Truck  ")).toEqual(["Pump Truck"]);
  });

  it("flattens object values", () => {
    expect(asTagList({ a: "Alpha", b: "Bravo" })).toEqual(["Alpha", "Bravo"]);
    expect(asTagList({ 0: "Rig 3" })).toEqual(["Rig 3"]);
  });

  it("returns [] for null and undefined", () => {
    expect(asTagList(null)).toEqual([]);
    expect(asTagList(undefined)).toEqual([]);
  });

  it("returns [] for empty or whitespace-only strings", () => {
    expect(asTagList("")).toEqual([]);
    expect(asTagList("   ")).toEqual([]);
  });

  it("returns [] for empty arrays and unsupported primitives", () => {
    expect(asTagList([])).toEqual([]);
    expect(asTagList(0)).toEqual([]);
    expect(asTagList(false)).toEqual([]);
  });
});
