import { listMappings } from "@/lib/board";
import { getDb } from "@/lib/db";
import { workizMappings } from "@/lib/db/schema";
import { emptyToNull } from "@/lib/jobFields";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ mappings: await listMappings() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const matchType = String(body?.matchType ?? "").trim();
  const matchValue = String(body?.matchValue ?? "").trim();
  const rigId = emptyToNull(body?.rigId);
  if (!["tag", "supervisor"].includes(matchType)) {
    return errorResponse("matchType must be tag or supervisor");
  }
  if (!matchValue) return errorResponse("matchValue is required");
  if (!rigId) return errorResponse("rigId is required");

  const db = await getDb();
  const [mapping] = await db
    .insert(workizMappings)
    .values({ matchType, matchValue, rigId })
    .returning();
  return json({ mapping }, 201);
}
