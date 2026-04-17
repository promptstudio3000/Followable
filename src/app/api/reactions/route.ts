import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { toggleReactionSchema } from "@/lib/validation";
import { toggleDatabaseReaction } from "@/server/data/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = toggleReactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reaction payload." }, { status: 400 });
  }

  try {
    const result = await toggleDatabaseReaction({
      viewerId,
      postId: parsed.data.postId,
      type: parsed.data.type,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update reaction." },
      { status: 500 },
    );
  }
}
