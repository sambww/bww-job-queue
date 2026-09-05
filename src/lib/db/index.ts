import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { ensureSchema } from "./ensure";

export type Database = NeonHttpDatabase<typeof schema>;

let db: Database | null = null;
let sqlClient: NeonQueryFunction<false, false> | null = null;
let ready: Promise<void> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = drizzle(getSql(), { schema });
  }
  if (!ready) {
    ready = ensureSchema(getSql()).catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  return db;
}

export { schema };
