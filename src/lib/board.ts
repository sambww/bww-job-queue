import { asc, desc } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "./db";
import { jobs, rigs, supervisors, syncRuns, workizMappings } from "./db/schema";

export type BoardJob = {
  id: string;
  jobCode: string;
  workizId: string | null;
  rigId: string | null;
  supervisorId: string | null;
  customerName: string;
  address: string;
  jobType: string;
  description: string;
  estimatedStartDate: string | null;
  status: string;
  queuePosition: number;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNotifyOptIn: boolean;
  supervisorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BoardRig = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  jobs: BoardJob[];
};

export type BoardPayload = {
  rigs: BoardRig[];
  unassigned: BoardJob[];
  supervisors: Array<{ id: string; name: string; active: boolean }>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  databaseConfigured: boolean;
};

function serializeJob(job: typeof jobs.$inferSelect): BoardJob {
  return {
    id: job.id,
    jobCode: job.jobCode,
    workizId: job.workizId,
    rigId: job.rigId,
    supervisorId: job.supervisorId,
    customerName: job.customerName,
    address: job.address,
    jobType: job.jobType,
    description: job.description,
    estimatedStartDate: job.estimatedStartDate?.toISOString() ?? null,
    status: job.status,
    queuePosition: job.queuePosition,
    customerEmail: job.customerEmail,
    customerPhone: job.customerPhone,
    customerNotifyOptIn: job.customerNotifyOptIn,
    supervisorName: job.supervisorName,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

const OPEN_STATUSES = new Set(["queued", "active", "unassigned"]);

export async function getBoard(): Promise<BoardPayload> {
  if (!isDatabaseConfigured()) {
    return {
      rigs: [],
      unassigned: [],
      supervisors: [],
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncMessage: "DATABASE_URL is not set",
      databaseConfigured: false,
    };
  }

  const db = await getDb();
  const [rigRows, jobRows, supervisorRows, [latestSync]] = await Promise.all([
    db.select().from(rigs).orderBy(asc(rigs.sortOrder), asc(rigs.name)),
    db.select().from(jobs).orderBy(asc(jobs.queuePosition), desc(jobs.createdAt)),
    db.select().from(supervisors).orderBy(asc(supervisors.name)),
    db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1),
  ]);

  const visibleJobs = jobRows
    .filter((job) => OPEN_STATUSES.has(job.status))
    .map(serializeJob);

  const boardRigs: BoardRig[] = rigRows
    .filter((rig) => rig.active)
    .map((rig) => ({
      ...rig,
      jobs: visibleJobs.filter((job) => job.rigId === rig.id),
    }));

  return {
    rigs: boardRigs,
    unassigned: visibleJobs.filter((job) => !job.rigId),
    supervisors: supervisorRows,
    lastSyncAt: latestSync?.finishedAt?.toISOString() ?? latestSync?.startedAt.toISOString() ?? null,
    lastSyncStatus: latestSync?.status ?? null,
    lastSyncMessage: latestSync?.message ?? null,
    databaseConfigured: true,
  };
}

export async function listAllJobs() {
  const db = await getDb();
  return db.select().from(jobs).orderBy(asc(jobs.queuePosition), desc(jobs.updatedAt));
}

export async function listRigs(includeInactive = true) {
  const db = await getDb();
  const rows = await db.select().from(rigs).orderBy(asc(rigs.sortOrder), asc(rigs.name));
  return includeInactive ? rows : rows.filter((rig) => rig.active);
}

export async function listSupervisors() {
  const db = await getDb();
  return db.select().from(supervisors).orderBy(asc(supervisors.name));
}

export async function listMappings() {
  const db = await getDb();
  return db.select().from(workizMappings);
}
