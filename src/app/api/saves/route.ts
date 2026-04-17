import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { toggleSaveSchema } from "@/lib/validation";
import { toggleDatabaseSave } from "@/server/data/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = toggleSaveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid save payload." }, { status: 400 });
  }

  try {
    const result = await toggleDatabaseSave({
      viewerId,
      postId: parsed.data.postId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update save." },
      { status: 500 },
    );
  }
}
