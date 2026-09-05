import { NextResponse } from "next/server";
import { createSessionToken, requireAdminPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";
  try {
    if (!requireAdminPassword(password)) {
      return errorResponse("Invalid password", 401);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Auth is not configured";
    return errorResponse(message, 500);
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
