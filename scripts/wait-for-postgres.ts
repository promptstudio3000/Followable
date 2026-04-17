import postgres from "postgres";
import { loadEnvLocal } from "./load-env-local";

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[followable] DATABASE_URL is missing. Copy .env.example to .env.local.");
  process.exit(1);
}

const maxAttempts = 60;
const delayMs = 1000;

async function main() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const sql = postgres(url, { max: 1, connect_timeout: 3, prepare: false });
    try {
      await sql`select 1 as ok`;
      await sql.end({ timeout: 2 });
      console.info(`[followable] Postgres is ready (attempt ${attempt}/${maxAttempts}).`);
      return;
    } catch {
      await sql.end({ timeout: 1 }).catch(() => {});
      if (attempt === maxAttempts) break;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(
    `[followable] Could not reach Postgres at DATABASE_URL within ${maxAttempts}s. Is Docker running? Try: npm run docker:up`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
