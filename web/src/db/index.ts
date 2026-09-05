import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle({ client: pool, schema });

/** Checks that PostgreSQL accepts a minimal query without exposing details. */
export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
