import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { toggleBlockSchema } from "@/lib/validation";
import { toggleDatabaseBlock } from "@/server/data/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = toggleBlockSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid block payload." }, { status: 400 });
  }

  try {
    const result = await toggleDatabaseBlock({
      viewerId,
      targetUserId: parsed.data.targetUserId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update block." },
      { status: 500 },
    );
  }
}
