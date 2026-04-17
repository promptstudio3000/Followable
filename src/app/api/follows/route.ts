import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { toggleFollowSchema } from "@/lib/validation";
import { toggleDatabaseFollow } from "@/server/data/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = toggleFollowSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid follow payload." }, { status: 400 });
  }

  try {
    const result = await toggleDatabaseFollow({
      viewerId,
      targetUserId: parsed.data.targetUserId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update follow." },
      { status: 500 },
    );
  }
}
