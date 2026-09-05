import type { NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rigs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS supervisors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    active boolean NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code text NOT NULL,
    workiz_id text,
    rig_id uuid REFERENCES rigs(id) ON DELETE SET NULL,
    supervisor_id uuid REFERENCES supervisors(id) ON DELETE SET NULL,
    customer_name text NOT NULL DEFAULT '',
    address text NOT NULL DEFAULT '',
    job_type text NOT NULL DEFAULT '',
    description text NOT NULL DEFAULT '',
    estimated_start_date timestamptz,
    status text NOT NULL DEFAULT 'queued',
    queue_position integer NOT NULL DEFAULT 0,
    customer_email text,
    customer_phone text,
    customer_notify_opt_in boolean NOT NULL DEFAULT false,
    supervisor_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS jobs_workiz_id_uidx
    ON jobs (workiz_id)
    WHERE workiz_id IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS workiz_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_type text NOT NULL,
    match_value text NOT NULL,
    rig_id uuid NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sync_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL DEFAULT 'running',
    message text NOT NULL DEFAULT '',
    jobs_pulled integer NOT NULL DEFAULT 0,
    jobs_created integer NOT NULL DEFAULT 0,
    jobs_updated integer NOT NULL DEFAULT 0,
    jobs_unmapped integer NOT NULL DEFAULT 0
  )`,
  `INSERT INTO rigs (name, active, sort_order) VALUES
    ('Rig 1', true, 1),
    ('Rig 2', true, 2),
    ('Rig 3', true, 3),
    ('Pump Truck', true, 4),
    ('Service', true, 5)
  ON CONFLICT (name) DO NOTHING`,
  `INSERT INTO supervisors (name, active) VALUES
    ('Sam Ballard', true),
    ('Field Supervisor', true),
    ('Dispatch', true)
  ON CONFLICT (name) DO NOTHING`,
];

export async function ensureSchema(sql: Sql) {
  for (const statement of STATEMENTS) {
    await sql.query(statement);
  }
}
