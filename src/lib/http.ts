import { NextResponse } from "next/server";
import { getSession } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function requireAdmin() {
  const ok = await getSession();
  if (!ok) {
    return errorResponse("Unauthorized", 401);
  }
  return null;
}

export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === secret || query === secret;
}
