import { listRigs } from "@/lib/board";
import { getDb } from "@/lib/db";
import { rigs } from "@/lib/db/schema";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ rigs: await listRigs(true) });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return errorResponse("name is required");

  const db = await getDb();
  const [rig] = await db
    .insert(rigs)
    .values({
      name,
      active: body?.active === false ? false : true,
      sortOrder: Number(body?.sortOrder ?? 99),
    })
    .returning();
  return json({ rig }, 201);
}
