import { errorResponse, json } from "@/lib/http";
import { pingWorkiz } from "@/lib/workiz/client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return json(await pingWorkiz());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workiz ping failed";
    return errorResponse(message, 502);
  }
}
