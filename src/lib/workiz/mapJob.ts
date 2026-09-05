import { asTagList } from "../asTagList";
import { emptyToNull } from "../jobFields";
import type { MappedWorkizJob, MappingRecord, WorkizJob } from "./types";

function firstString(job: WorkizJob, keys: string[]): string | null {
  for (const key of keys) {
    const value = job[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function nestedString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return firstString(record, keys);
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(", ");
}

export function extractWorkizId(job: WorkizJob): string | null {
  return firstString(job, ["UUID", "uuid", "Id", "id", "SerialId"]);
}

export function extractTags(job: WorkizJob): string[] {
  return asTagList(job.Tags ?? job.tags ?? job.Tag ?? job.Labels ?? job.labels);
}

export function extractSupervisorCandidates(job: WorkizJob): string[] {
  const names = new Set<string>();
  const direct = firstString(job, ["Supervisor", "supervisor", "SupervisorName", "AssignedTo"]);
  if (direct) names.add(direct);

  const team = job.Team ?? job.team ?? job.Assigned ?? job.Users;
  if (Array.isArray(team)) {
    for (const member of team) {
      if (typeof member === "string" && member.trim()) {
        names.add(member.trim());
      } else if (member && typeof member === "object") {
        const record = member as Record<string, unknown>;
        const name = firstString(record, ["name", "Name", "fullName", "FullName"]);
        if (name) names.add(name);
      }
    }
  } else if (typeof team === "string" && team.trim()) {
    names.add(team.trim());
  }

  return [...names];
}

export function mapWorkizStatus(raw: string | null): string {
  const status = (raw ?? "").toLowerCase();
  if (["in progress", "in_progress", "submitted", "on my way", "working"].some((s) => status.includes(s))) {
    return "active";
  }
  if (["done", "completed", "closed", "paid"].some((s) => status.includes(s))) {
    return "completed";
  }
  if (["cancel"].some((s) => status.includes(s))) {
    return "cancelled";
  }
  if (["unassigned", "pending"].some((s) => status.includes(s))) {
    return "unassigned";
  }
  return "queued";
}

export function mapWorkizJob(job: WorkizJob): MappedWorkizJob | null {
  const workizId = extractWorkizId(job);
  if (!workizId) return null;

  const first = firstString(job, ["FirstName", "firstName"]) ?? "";
  const last = firstString(job, ["LastName", "lastName"]) ?? "";
  const company = firstString(job, ["Company", "company", "CompanyName"]) ?? "";
  const clientInfo = job.clientInfo ?? job.Client;
  const clientName =
    nestedString(clientInfo, ["firstName", "FirstName", "name", "Name"]) ??
    [nestedString(clientInfo, ["firstName"]), nestedString(clientInfo, ["lastName"])]
      .filter(Boolean)
      .join(" ");
  const customerName = `${first} ${last}`.trim() || clientName || company || "Unknown customer";

  const addressDetails =
    clientInfo && typeof clientInfo === "object"
      ? (clientInfo as Record<string, unknown>).addressDetails
      : undefined;
  const street =
    firstString(job, ["Address", "address"]) ??
    nestedString(addressDetails, ["address", "Address"]) ??
    "";
  const city =
    firstString(job, ["City", "city"]) ?? nestedString(addressDetails, ["city", "City"]) ?? "";
  const state =
    firstString(job, ["State", "state"]) ?? nestedString(addressDetails, ["state", "State"]) ?? "";
  const zip =
    firstString(job, ["PostalCode", "postalCode", "Zip"]) ??
    nestedString(addressDetails, ["zipcode", "zip", "PostalCode"]) ??
    "";
  const address = joinParts([street, city, state, zip]);

  const jobTypeValue = job.JobType ?? job.jobType;
  const jobType =
    typeof jobTypeValue === "string"
      ? jobTypeValue
      : nestedString(jobTypeValue, ["name", "Name"]) ?? "";

  const serial = firstString(job, ["SerialId", "serialId", "JobNumber", "jobCode"]);
  const jobCode = serial ? `WZ-${serial}` : `WZ-${workizId.slice(0, 8)}`;

  const startRaw = firstString(job, ["JobDateTime", "JobEndDateTime", "date", "startDate"]);
  const estimatedStartDate = startRaw ? new Date(startRaw.replace(" ", "T")) : null;

  const supervisorCandidates = extractSupervisorCandidates(job);

  return {
    workizId,
    jobCode,
    customerName,
    address,
    jobType,
    description:
      firstString(job, ["Comments", "JobNotes", "description", "Description", "Notes"]) ?? "",
    estimatedStartDate:
      estimatedStartDate && !Number.isNaN(estimatedStartDate.getTime()) ? estimatedStartDate : null,
    status: mapWorkizStatus(firstString(job, ["Status", "status", "SubStatus"])),
    customerEmail: emptyToNull(
      firstString(job, ["Email", "email"]) ?? nestedString(clientInfo, ["email", "Email"]),
    ),
    customerPhone: emptyToNull(
      firstString(job, ["Phone", "phone", "primaryPhone"]) ??
        nestedString(clientInfo, ["primaryPhone", "Phone"]),
    ),
    supervisorName: supervisorCandidates[0] ?? null,
    tags: extractTags(job),
    supervisorCandidates,
  };
}

export function resolveRigId(
  mapped: MappedWorkizJob,
  mappings: MappingRecord[],
): string | null {
  const tagMaps = mappings.filter((item) => item.matchType === "tag");
  const supervisorMaps = mappings.filter((item) => item.matchType === "supervisor");

  for (const tag of mapped.tags) {
    const match = tagMaps.find(
      (item) => item.matchValue.trim().toLowerCase() === tag.trim().toLowerCase(),
    );
    if (match) return match.rigId;
  }

  for (const name of mapped.supervisorCandidates) {
    const match = supervisorMaps.find(
      (item) => item.matchValue.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (match) return match.rigId;
  }

  return null;
}
