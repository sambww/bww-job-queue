import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { workizMappings } from "@/lib/db/schema";
import { emptyToNull } from "@/lib/jobFields";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return errorResponse("Invalid JSON");

  const db = await getDb();
  const [current] = await db.select().from(workizMappings).where(eq(workizMappings.id, id)).limit(1);
  if (!current) return errorResponse("Mapping not found", 404);

  const matchType = body.matchType === undefined ? current.matchType : String(body.matchType);
  if (!["tag", "supervisor"].includes(matchType)) {
    return errorResponse("matchType must be tag or supervisor");
  }

  const [mapping] = await db
    .update(workizMappings)
    .set({
      matchType,
      matchValue: body.matchValue === undefined ? current.matchValue : String(body.matchValue).trim(),
      rigId: body.rigId === undefined ? current.rigId : (emptyToNull(body.rigId) ?? current.rigId),
    })
    .where(eq(workizMappings.id, id))
    .returning();

  return json({ mapping });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const db = await getDb();
  const [mapping] = await db.delete(workizMappings).where(eq(workizMappings.id, id)).returning();
  if (!mapping) return errorResponse("Mapping not found", 404);
  return json({ ok: true });
}
