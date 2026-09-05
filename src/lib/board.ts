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

function demoJob(partial: Partial<BoardJob> & Pick<BoardJob, "id" | "jobCode" | "customerName">): BoardJob {
  return {
    workizId: null,
    rigId: null,
    supervisorId: null,
    address: "",
    jobType: "",
    description: "",
    estimatedStartDate: null,
    status: "queued",
    queuePosition: 0,
    customerEmail: null,
    customerPhone: null,
    customerNotifyOptIn: false,
    supervisorName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

export function demoBoard(): BoardPayload {
  return {
    databaseConfigured: false,
    lastSyncAt: null,
    lastSyncStatus: null,
    lastSyncMessage: "DATABASE_URL is not set — showing preview jobs only",
    supervisors: [
      { id: "sup-1", name: "Sam Ballard", active: true },
      { id: "sup-2", name: "Field Supervisor", active: true },
    ],
    unassigned: [
      demoJob({
        id: "demo-u1",
        jobCode: "WZ-1003",
        customerName: "Unmapped Workiz job",
        address: "Need tag or supervisor mapping",
        jobType: "Service call",
        status: "unassigned",
        queuePosition: 0,
      }),
    ],
    rigs: [
      {
        id: "demo-rig-1",
        name: "Rig 1",
        active: true,
        sortOrder: 1,
        jobs: [
          demoJob({
            id: "demo-1",
            jobCode: "WZ-4401",
            rigId: "demo-rig-1",
            customerName: "Jane Wells",
            address: "100 County Rd, Willis, TX",
            jobType: "New well",
            estimatedStartDate: "2026-09-08T13:00:00.000Z",
            status: "active",
            queuePosition: 0,
            supervisorName: "Sam Ballard",
          }),
          demoJob({
            id: "demo-2",
            jobCode: "WZ-4408",
            rigId: "demo-rig-1",
            customerName: "Magnolia Ranch",
            address: "412 Pine Lake, Magnolia, TX",
            jobType: "Pump install",
            estimatedStartDate: "2026-09-10T13:00:00.000Z",
            queuePosition: 1,
            supervisorName: "Field Supervisor",
          }),
        ],
      },
      {
        id: "demo-rig-2",
        name: "Rig 2",
        active: true,
        sortOrder: 2,
        jobs: [
          demoJob({
            id: "demo-3",
            jobCode: "WZ-4412",
            rigId: "demo-rig-2",
            customerName: "Conroe ISD",
            address: "88 Lake Rd, Conroe, TX",
            jobType: "Commercial well",
            estimatedStartDate: "2026-09-12T13:00:00.000Z",
            queuePosition: 0,
          }),
        ],
      },
      {
        id: "demo-rig-3",
        name: "Rig 3",
        active: true,
        sortOrder: 3,
        jobs: [],
      },
    ],
  };
}

export async function getBoard(): Promise<BoardPayload> {
  if (!isDatabaseConfigured()) {
    return demoBoard();
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
