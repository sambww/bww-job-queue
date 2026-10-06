import type { WorkizJob } from "./types";

const DEFAULT_LOOKBACK_DAYS = 730;
const MAX_ERROR_SNIPPET = 1000;

function workizBaseUrl() {
  const token = process.env.WORKIZ_API_TOKEN?.trim();
  if (!token) {
    throw new Error("WORKIZ_API_TOKEN is not set");
  }
  return `https://api.workiz.com/api/v1/${encodeURIComponent(token)}`;
}

export function workizLookbackDays(): number {
  const raw = Number(process.env.WORKIZ_LOOKBACK_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_LOOKBACK_DAYS;
}

export function workizStartDate(days: number, now: Date = new Date()): string {
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return from.toISOString().slice(0, 10);
}

export type JobAllQueryInput = {
  records: number;
  offset: number;
  onlyOpen?: boolean;
  now?: Date;
};

/**
 * Easy API / Zapier-style `?secret=` is not a documented Developer API /job/all/
 * param and is the leading HTTP 400 hypothesis. Only attach it when explicitly
 * opted in via WORKIZ_API_MODE=easy (and WORKIZ_AUTH_SECRET is set).
 */
export function isWorkizEasyApiMode(): boolean {
  const mode = (process.env.WORKIZ_API_MODE ?? "developer").trim().toLowerCase();
  return mode === "easy" || mode === "easy-api" || mode === "easy_api";
}

export function applyWorkizQueryAuth(params: Record<string, string>): Record<string, string> {
  if (!isWorkizEasyApiMode()) return params;
  const secret = process.env.WORKIZ_AUTH_SECRET?.trim();
  if (!secret) return params;
  return { ...params, secret };
}

/**
 * Developer API GET /job/all/ query string.
 * Documented params: records (max 100), offset, only_open, start_date (yyyy-MM-dd), status.
 */
export function buildJobAllQuery(input: JobAllQueryInput): Record<string, string> {
  const records = Math.min(100, Math.max(1, Math.floor(input.records)));
  const offset = Math.max(0, Math.floor(input.offset));
  const params: Record<string, string> = {
    records: String(records),
    offset: String(offset),
    start_date: workizStartDate(workizLookbackDays(), input.now),
  };
  if (input.onlyOpen !== false) {
    params.only_open = "true";
  }
  return applyWorkizQueryAuth(params);
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

function clip(text: string): string {
  return text.length > MAX_ERROR_SNIPPET ? `${text.slice(0, MAX_ERROR_SNIPPET)}…` : text;
}

export function workizErrorMessage(status: number, body: unknown, rawText?: string): string {
  const base = `Workiz HTTP ${status}`;

  if (body && typeof body === "object") {
    const json = stringifyDetail(body);
    if (json && json !== "{}" && json !== "[]") {
      return `${base}: ${clip(json)}`;
    }
  } else if (typeof body === "string" && body.trim()) {
    return `${base}: ${clip(body.trim())}`;
  }

  const raw = rawText?.trim();
  if (raw) return `${base}: ${clip(raw)}`;
  return base;
}

function isWorkizFailureFlag(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && "flag" in body && (body as { flag: unknown }).flag === false);
}

export async function workizGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${workizBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(applyWorkizQueryAuth(params))) {
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

  if (!response.ok || isWorkizFailureFlag(body)) {
    throw new Error(workizErrorMessage(response.status, body, rawText));
  }
  return body;
}

export async function pingWorkiz() {
  const started = Date.now();
  const body = await workizGet("/job/all/", buildJobAllQuery({ records: 1, offset: 0 }));
  return {
    ok: true,
    latencyMs: Date.now() - started,
    flag: Boolean(body && typeof body === "object" && "flag" in body ? (body as { flag: unknown }).flag : true),
    sampleCount: Array.isArray((body as { data?: unknown })?.data)
      ? (body as { data: unknown[] }).data.length
      : 0,
  };
}

export type OpenWorkizPull = {
  jobs: WorkizJob[];
  /** False when pagination stopped before Workiz confirmed the list was finished. */
  complete: boolean;
  /** `start_date` sent with every page of this pull (`yyyy-MM-dd`). */
  startDate: string;
};

const MAX_JOB_PAGES = 20;

/**
 * Decide whether another page is required and whether the pages already fetched
 * are a complete open-job list. A short page, or `has_more: false`, ends a
 * complete pull. A full page with `has_more: true` (or with the flag omitted)
 * keeps going. Hitting the page cap first is an incomplete pull.
 */
export function isOpenJobPullComplete(input: {
  hasMore: boolean | null;
  pageCount: number;
  pageSize: number;
  pagesFetched: number;
  maxPages: number;
}): { done: boolean; complete: boolean } {
  if (input.hasMore === true) {
    if (input.pagesFetched >= input.maxPages) return { done: true, complete: false };
    return { done: false, complete: false };
  }
  if (input.pageCount < input.pageSize || input.hasMore === false) {
    return { done: true, complete: true };
  }
  if (input.pagesFetched >= input.maxPages) return { done: true, complete: false };
  return { done: false, complete: false };
}

export async function fetchOpenWorkizJobs(): Promise<OpenWorkizPull> {
  const jobs: WorkizJob[] = [];
  let offset = 0;
  const records = 100;
  const now = new Date();
  const startDate = workizStartDate(workizLookbackDays(), now);

  for (let page = 0; page < MAX_JOB_PAGES; page += 1) {
    const body = (await workizGet("/job/all/", buildJobAllQuery({ records, offset, now }))) as {
      data?: unknown;
      has_more?: unknown;
    };

    if (!Array.isArray(body?.data)) {
      throw new Error("Workiz job list returned no data array");
    }

    const rows = body.data as WorkizJob[];
    jobs.push(...rows);
    const hasMore = typeof body.has_more === "boolean" ? body.has_more : null;
    const decision = isOpenJobPullComplete({
      hasMore,
      pageCount: rows.length,
      pageSize: records,
      pagesFetched: page + 1,
      maxPages: MAX_JOB_PAGES,
    });
    if (decision.done) {
      return { jobs, complete: decision.complete, startDate };
    }
    offset += records;
  }

  return { jobs, complete: false, startDate };
}
