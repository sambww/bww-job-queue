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

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "data" in body
        ? String((body as { data: unknown }).data)
        : `Workiz HTTP ${response.status}`;
    throw new Error(message);
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
