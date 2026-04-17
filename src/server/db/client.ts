import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const globalForDatabase = globalThis as unknown as {
  followableSql?: postgres.Sql;
  followableDb?: ReturnType<typeof drizzle>;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Drop pooled connections after auth failure or bootstrap errors so the next request can retry or use demo. */
export function resetDatabaseClient() {
  const sql = globalForDatabase.followableSql;
  globalForDatabase.followableSql = undefined;
  globalForDatabase.followableDb = undefined;
  if (sql) {
    void sql.end({ timeout: 2 }).catch(() => {});
  }
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForDatabase.followableSql) {
    globalForDatabase.followableSql = postgres(process.env.DATABASE_URL, {
      max: 5,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 5,
    });
    globalForDatabase.followableDb = drizzle(globalForDatabase.followableSql);
  }

  return {
    sql: globalForDatabase.followableSql,
    db: globalForDatabase.followableDb!,
  };
}
