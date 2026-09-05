import { desc, eq, isNull, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { emptyToNull, isJobStatus, parseDate } from "@/lib/jobFields";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(jobs).orderBy(desc(jobs.updatedAt));
  return json({ jobs: rows });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return errorResponse("Invalid JSON");

  const jobCode = String(body.jobCode ?? "").trim();
  if (!jobCode) return errorResponse("jobCode is required");

  const rigId = emptyToNull(body.rigId);
  const status = isJobStatus(body.status) ? body.status : rigId ? "queued" : "unassigned";

  const db = await getDb();
  const [{ value }] = await db
    .select({ value: max(jobs.queuePosition) })
    .from(jobs)
    .where(rigId ? eq(jobs.rigId, rigId) : isNull(jobs.rigId));

  const [job] = await db
    .insert(jobs)
    .values({
      jobCode,
      workizId: emptyToNull(body.workizId),
      rigId,
      supervisorId: emptyToNull(body.supervisorId),
      customerName: String(body.customerName ?? ""),
      address: String(body.address ?? ""),
      jobType: String(body.jobType ?? ""),
      description: String(body.description ?? ""),
      estimatedStartDate: parseDate(body.estimatedStartDate),
      status,
      queuePosition: (value ?? -1) + 1,
      customerEmail: emptyToNull(body.customerEmail),
      customerPhone: emptyToNull(body.customerPhone),
      customerNotifyOptIn: Boolean(body.customerNotifyOptIn),
      supervisorName: emptyToNull(body.supervisorName),
    })
    .returning();

  return json({ job }, 201);
}
