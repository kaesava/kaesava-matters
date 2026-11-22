import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as defaultSchema from "@money-matters/db";

export function createDbClient<TSchema extends Record<string, unknown> = typeof defaultSchema>(
  connectionString?: string,
  schemaOverride?: TSchema
) {
  const conn = connectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error("DATABASE_URL is required to create a database client.");
  }
  const pool = new Pool({ connectionString: conn });
  return drizzle(pool, { schema: (schemaOverride ?? defaultSchema) as TSchema });
}

