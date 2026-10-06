import { describe, expect, it } from "vitest";
import { extractTags, mapWorkizJob, resolveRigId } from "./mapJob";

describe("extractTags", () => {
  it("does not throw when Tags is a string", () => {
    expect(extractTags({ Tags: "Rig 1" })).toEqual(["Rig 1"]);
  });

  it("accepts a Tags array", () => {
    expect(extractTags({ Tags: ["Rig 2", "Priority"] })).toEqual(["Rig 2", "Priority"]);
  });
});

describe("mapWorkizJob + resolveRigId", () => {
  it("maps a typical Workiz job and routes by string tag", () => {
    const mapped = mapWorkizJob({
      UUID: "abc-123",
      SerialId: 4401,
      FirstName: "Jane",
      LastName: "Wells",
      Address: "100 County Rd",
      City: "Willis",
      State: "TX",
      PostalCode: "77318",
      JobType: "New Well",
      Status: "Scheduled",
      Tags: "Rig 1",
      Team: [{ name: "Sam Ballard" }],
    });

    expect(mapped?.jobCode).toBe("WZ-4401");
    expect(mapped?.estimatedStartDate).toBeNull();
    expect(mapped?.customerName).toBe("Jane Wells");
    expect(mapped?.tags).toEqual(["Rig 1"]);
    expect(mapped?.supervisorName).toBe("Sam Ballard");
    expect(
      resolveRigId(mapped!, [
        { id: "m1", matchType: "tag", matchValue: "rig 1", rigId: "rig-1" },
      ]),
    ).toBe("rig-1");
  });

  it("stores an offset-less JobDateTime as the Chicago instant", () => {
    const summer = mapWorkizJob({
      UUID: "summer",
      JobDateTime: "2026-07-15 08:00:00",
      Status: "Scheduled",
    });
    const winter = mapWorkizJob({
      UUID: "winter",
      JobDateTime: "2026-01-15 08:00:00",
      Status: "Scheduled",
    });
    const absolute = mapWorkizJob({
      UUID: "absolute",
      JobDateTime: "2016-08-29T09:12:33.001Z",
      Status: "Scheduled",
    });

    expect(summer?.estimatedStartDate?.toISOString()).toBe("2026-07-15T13:00:00.000Z");
    expect(winter?.estimatedStartDate?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
    expect(absolute?.estimatedStartDate?.toISOString()).toBe("2016-08-29T09:12:33.001Z");
  });
});
