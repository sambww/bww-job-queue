import type { WorkizJob } from "./types";

function workizBaseUrl() {
  const token = process.env.WORKIZ_API_TOKEN;
  if (!token) {
    throw new Error("WORKIZ_API_TOKEN is not set");
  }
  return `https://api.workiz.com/api/v1/${encodeURIComponent(token)}`;
}

function withSecret(url: URL) {
  const secret = process.env.WORKIZ_AUTH_SECRET;
  if (secret) {
    url.searchParams.set("secret", secret);
  }
  return url;
}

function stringifyDetail(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

// Workiz returns JSON on errors, but the useful text can live under different
// keys (and some failures return non-JSON). Surface whatever detail we can find
// so the dashboard shows the real reason instead of a bare status code.
export function workizErrorMessage(status: number, body: unknown, rawText?: string): string {
  const base = `Workiz HTTP ${status}`;

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["error", "message", "msg", "data", "errors"]) {
      if (key in record) {
        const detail = stringifyDetail(record[key]);
        if (detail && detail !== "{}" && detail !== "[]") {
          return `${base}: ${detail}`;
        }
      }
    }
  }

  const raw = rawText?.trim();
  if (raw) {
    const snippet = raw.length > 300 ? `${raw.slice(0, 300)}…` : raw;
    return `${base}: ${snippet}`;
  }

  return base;
}

export async function workizGet(path: string, params: Record<string, string> = {}) {
  const url = withSecret(new URL(`${workizBaseUrl()}${path}`));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const rawText = await response.text();
  let body: unknown = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(workizErrorMessage(response.status, body, rawText));
  }
  return body;
}

export async function pingWorkiz() {
  const started = Date.now();
  const body = await workizGet("/job/all/", { records: "1", offset: "0" });
  return {
    ok: true,
    latencyMs: Date.now() - started,
    flag: Boolean(body && typeof body === "object" && "flag" in body ? body.flag : true),
    sampleCount: Array.isArray((body as { data?: unknown })?.data)
      ? (body as { data: unknown[] }).data.length
      : 0,
  };
}

export async function fetchOpenWorkizJobs(): Promise<WorkizJob[]> {
  const jobs: WorkizJob[] = [];
  let offset = 0;
  const records = 100;

  for (let page = 0; page < 20; page += 1) {
    const body = (await workizGet("/job/all/", {
      records: String(records),
      offset: String(offset),
      only_open: "true",
    })) as { data?: unknown; has_more?: boolean };

    const rows = Array.isArray(body?.data) ? (body.data as WorkizJob[]) : [];
    jobs.push(...rows);
    if (!body?.has_more || rows.length < records) break;
    offset += records;
  }

  return jobs;
}
