import { appendFile, mkdir } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const LOG_PATH = join(process.cwd(), ".cursor", "debug-44cb16.log");

export async function POST(req: Request) {
  try {
    const text = await req.text();
    await mkdir(join(process.cwd(), ".cursor"), { recursive: true });
    await appendFile(LOG_PATH, `${text}\n`, "utf8");
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
