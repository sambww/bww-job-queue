import { eq, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { emptyToNull, isJobStatus, parseDate } from "@/lib/jobFields";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return errorResponse("Invalid JSON");

  const db = await getDb();
  const [current] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!current) return errorResponse("Job not found", 404);

  const nextRigId = body.rigId === undefined ? current.rigId : emptyToNull(body.rigId);
  let queuePosition = current.queuePosition;
  if (nextRigId !== current.rigId) {
    const [{ value }] = await db
      .select({ value: max(jobs.queuePosition) })
      .from(jobs)
      .where(nextRigId ? eq(jobs.rigId, nextRigId) : eq(jobs.id, jobs.id));
    queuePosition = (value ?? -1) + 1;
  }

  const [job] = await db
    .update(jobs)
    .set({
      jobCode: body.jobCode === undefined ? current.jobCode : String(body.jobCode),
      workizId: body.workizId === undefined ? current.workizId : emptyToNull(body.workizId),
      rigId: nextRigId,
      supervisorId:
        body.supervisorId === undefined ? current.supervisorId : emptyToNull(body.supervisorId),
      customerName:
        body.customerName === undefined ? current.customerName : String(body.customerName ?? ""),
      address: body.address === undefined ? current.address : String(body.address ?? ""),
      jobType: body.jobType === undefined ? current.jobType : String(body.jobType ?? ""),
      description:
        body.description === undefined ? current.description : String(body.description ?? ""),
      estimatedStartDate:
        body.estimatedStartDate === undefined
          ? current.estimatedStartDate
          : parseDate(body.estimatedStartDate),
      status: isJobStatus(body.status) ? body.status : current.status,
      queuePosition,
      customerEmail:
        body.customerEmail === undefined ? current.customerEmail : emptyToNull(body.customerEmail),
      customerPhone:
        body.customerPhone === undefined ? current.customerPhone : emptyToNull(body.customerPhone),
      customerNotifyOptIn:
        body.customerNotifyOptIn === undefined
          ? current.customerNotifyOptIn
          : Boolean(body.customerNotifyOptIn),
      supervisorName:
        body.supervisorName === undefined ? current.supervisorName : emptyToNull(body.supervisorName),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, id))
    .returning();

  return json({ job });
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const db = await getDb();
  const [job] = await db.delete(jobs).where(eq(jobs.id, id)).returning();
  if (!job) return errorResponse("Job not found", 404);
  return json({ ok: true });
}
