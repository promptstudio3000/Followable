import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const lock = join(process.cwd(), ".next", "lock");
if (existsSync(lock)) {
  rmSync(lock, { force: true });
  console.info("[followable] Removed stale .next/lock");
}
