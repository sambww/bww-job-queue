import { getBoard } from "@/lib/board";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await getBoard());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load board";
    return errorResponse(message, 500);
  }
}
