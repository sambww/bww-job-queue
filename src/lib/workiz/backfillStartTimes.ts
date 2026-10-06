import { getSql } from "../db";

/**
 * One-shot correction for start times stored before offset-less Workiz datetimes
 * were interpreted as America/Chicago. The claim and the update are one statement,
 * so a second sync cannot shift the same rows again.
 *
 * Equivalent to reinterpretUtcWallClockAsChicago: UTC clock fields are the original
 * wall time, and Postgres `(ts AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'`
 * applies that zone's DST offset.
 */
export async function backfillChicagoStartTimesOnce(): Promise<void> {
  await getSql().query(`
    WITH claim AS (
      INSERT INTO app_flags (key, value)
      VALUES ('chicago_start_backfill_v1', 'done')
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    )
    UPDATE jobs
    SET estimated_start_date = (estimated_start_date AT TIME ZONE 'UTC') AT TIME ZONE 'America/Chicago'
    WHERE workiz_id IS NOT NULL
      AND estimated_start_date IS NOT NULL
      AND EXISTS (SELECT 1 FROM claim)
  `);
}
