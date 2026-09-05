import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const rigs = pgTable("rigs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const supervisors = pgTable("supervisors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobCode: text("job_code").notNull(),
    workizId: text("workiz_id"),
    rigId: uuid("rig_id").references(() => rigs.id, { onDelete: "set null" }),
    supervisorId: uuid("supervisor_id").references(() => supervisors.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull().default(""),
    address: text("address").notNull().default(""),
    jobType: text("job_type").notNull().default(""),
    description: text("description").notNull().default(""),
    estimatedStartDate: timestamp("estimated_start_date", { withTimezone: true }),
    status: text("status").notNull().default("queued"),
    queuePosition: integer("queue_position").notNull().default(0),
    customerEmail: text("customer_email"),
    customerPhone: text("customer_phone"),
    customerNotifyOptIn: boolean("customer_notify_opt_in").notNull().default(false),
    supervisorName: text("supervisor_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("jobs_workiz_id_uidx").on(table.workizId)],
);

export const workizMappings = pgTable("workiz_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchType: text("match_type").notNull(),
  matchValue: text("match_value").notNull(),
  rigId: uuid("rig_id")
    .notNull()
    .references(() => rigs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  message: text("message").notNull().default(""),
  jobsPulled: integer("jobs_pulled").notNull().default(0),
  jobsCreated: integer("jobs_created").notNull().default(0),
  jobsUpdated: integer("jobs_updated").notNull().default(0),
  jobsUnmapped: integer("jobs_unmapped").notNull().default(0),
});

export type Rig = typeof rigs.$inferSelect;
export type Supervisor = typeof supervisors.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type WorkizMapping = typeof workizMappings.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
