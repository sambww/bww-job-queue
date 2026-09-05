import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { emptyToNull } from "@/lib/jobFields";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    rigId?: string | null;
    jobIds?: string[];
  } | null;
  if (!body || !Array.isArray(body.jobIds)) {
    return errorResponse("jobIds is required");
  }

  const rigId = emptyToNull(body.rigId);
  const db = await getDb();

  for (const [index, jobId] of body.jobIds.entries()) {
    await db
      .update(jobs)
      .set({
        rigId,
        queuePosition: index,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId)));
  }

  return json({ ok: true, count: body.jobIds.length });
}
