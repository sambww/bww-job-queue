import { cronAuthorized, errorResponse, json } from "@/lib/http";
import { runWorkizSync } from "@/lib/workiz/sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return errorResponse("Unauthorized", 401);
  }
  try {
    return json(await runWorkizSync());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workiz sync failed";
    return errorResponse(message, 502);
  }
}
