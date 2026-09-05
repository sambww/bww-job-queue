import { and, desc, eq, isNotNull, max, sql } from "drizzle-orm";
import { getDb } from "../db";
import { jobs, syncRuns, workizMappings, supervisors } from "../db/schema";
import { fetchOpenWorkizJobs } from "./client";
import { mapWorkizJob, resolveRigId } from "./mapJob";

export type SyncResult = {
  jobsPulled: number;
  jobsCreated: number;
  jobsUpdated: number;
  jobsUnmapped: number;
  skipped: number;
};

async function nextQueuePosition(db: Awaited<ReturnType<typeof getDb>>, rigId: string | null) {
  const [{ value }] = await db
    .select({ value: max(jobs.queuePosition) })
    .from(jobs)
    .where(rigId ? eq(jobs.rigId, rigId) : sql`${jobs.rigId} is null`);
  return (value ?? -1) + 1;
}

function matchSupervisorId(
  rows: Array<{ id: string; name: string }>,
  names: string[],
): string | null {
  for (const name of names) {
    const match = rows.find((row) => row.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (match) return match.id;
  }
  return null;
}

export async function runWorkizSync(): Promise<SyncResult> {
  const db = await getDb();
  const [run] = await db.insert(syncRuns).values({ status: "running" }).returning();

  try {
    const [openJobs, mappings, existing, supervisorRows] = await Promise.all([
      fetchOpenWorkizJobs(),
      db.select().from(workizMappings),
      db.select().from(jobs).where(isNotNull(jobs.workizId)),
      db.select().from(supervisors),
    ]);

    const existingByWorkizId = new Map(
      existing.filter((job) => job.workizId).map((job) => [job.workizId as string, job]),
    );

    let jobsCreated = 0;
    let jobsUpdated = 0;
    let jobsUnmapped = 0;
    let skipped = 0;

    for (const raw of openJobs) {
      const mapped = mapWorkizJob(raw);
      if (!mapped) {
        skipped += 1;
        continue;
      }

      const mappedRigId = resolveRigId(mapped, mappings);
      if (!mappedRigId) jobsUnmapped += 1;
      const supervisorId = matchSupervisorId(supervisorRows, mapped.supervisorCandidates);
      const current = existingByWorkizId.get(mapped.workizId);

      if (!current) {
        const queuePosition = await nextQueuePosition(db, mappedRigId);
        const [created] = await db
          .insert(jobs)
          .values({
            jobCode: mapped.jobCode,
            workizId: mapped.workizId,
            rigId: mappedRigId,
            supervisorId,
            customerName: mapped.customerName,
            address: mapped.address,
            jobType: mapped.jobType,
            description: mapped.description,
            estimatedStartDate: mapped.estimatedStartDate,
            status: mappedRigId ? mapped.status : "unassigned",
            queuePosition,
            customerEmail: mapped.customerEmail,
            customerPhone: mapped.customerPhone,
            supervisorName: mapped.supervisorName,
          })
          .returning();
        existingByWorkizId.set(mapped.workizId, created);
        jobsCreated += 1;
        continue;
      }

      // Idempotent update: refresh Workiz fields, never overwrite admin queue positions.
      await db
        .update(jobs)
        .set({
          jobCode: mapped.jobCode,
          customerName: mapped.customerName,
          address: mapped.address,
          jobType: mapped.jobType,
          description: mapped.description,
          estimatedStartDate: mapped.estimatedStartDate,
          status: current.status === "completed" || current.status === "cancelled" ? current.status : mapped.status,
          customerEmail: mapped.customerEmail,
          customerPhone: mapped.customerPhone,
          supervisorName: mapped.supervisorName,
          supervisorId: current.supervisorId ?? supervisorId,
          rigId: current.rigId ?? mappedRigId,
          updatedAt: new Date(),
        })
        .where(and(eq(jobs.id, current.id)));
      jobsUpdated += 1;
    }

    const result: SyncResult = {
      jobsPulled: openJobs.length,
      jobsCreated,
      jobsUpdated,
      jobsUnmapped,
      skipped,
    };

    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        message: `Pulled ${result.jobsPulled}, created ${result.jobsCreated}, updated ${result.jobsUpdated}, unmapped ${result.jobsUnmapped}.`,
        jobsPulled: result.jobsPulled,
        jobsCreated: result.jobsCreated,
        jobsUpdated: result.jobsUpdated,
        jobsUnmapped: result.jobsUnmapped,
      })
      .where(eq(syncRuns.id, run.id));

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workiz sync failed";
    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        message,
      })
      .where(eq(syncRuns.id, run.id));
    throw error;
  }
}

export async function latestSyncRuns(limit = 8) {
  const db = await getDb();
  return db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(limit);
}
