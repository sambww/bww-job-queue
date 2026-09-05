import { listSupervisors } from "@/lib/board";
import { getDb } from "@/lib/db";
import { supervisors } from "@/lib/db/schema";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return json({ supervisors: await listSupervisors() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return errorResponse("name is required");
  const db = await getDb();
  const [supervisor] = await db
    .insert(supervisors)
    .values({ name, active: body?.active === false ? false : true })
    .returning();
  return json({ supervisor }, 201);
}
