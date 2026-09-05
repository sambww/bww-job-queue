import { latestSyncRuns, runWorkizSync } from "@/lib/workiz/sync";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json({ runs: await latestSyncRuns() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sync status";
    return errorResponse(message, 500);
  }
}

export async function POST() {
  try {
    return json(await runWorkizSync());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workiz sync failed";
    return errorResponse(message, 502);
  }
}
