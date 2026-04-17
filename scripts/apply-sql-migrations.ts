import { readdirSync } from "fs";
import { join, resolve } from "path";
import postgres from "postgres";
import { loadEnvLocal } from "./load-env-local";

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[followable] DATABASE_URL is missing. Copy .env.example to .env.local.");
  process.exit(1);
}

async function main() {
  const sql = postgres(url, { max: 1, prepare: false });
  const drizzleDir = resolve(process.cwd(), "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of files) {
    const filePath = join(drizzleDir, name);
    console.info(`[followable] db:migrate:sql — applying ${name}…`);
    await sql.file(filePath);
  }

  await sql.end();
  console.info("[followable] db:migrate:sql — finished.");
}

main().catch((e) => {
  console.error(e);
  console.error(
    "\n[followable] If the DB already had schema (duplicate type/table), use a clean volume: npm run docker:setup:fresh\n" +
      "Or skip migrate and only refresh data: npm run db:seed\n",
  );
  process.exit(1);
});
