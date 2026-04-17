import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { createPostSchema } from "@/lib/validation";
import { createDatabasePost } from "@/server/data/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid post payload." }, { status: 400 });
  }

  try {
    const bundle = await createDatabasePost({
      viewerId,
      payload: parsed.data,
      media: parsed.data.media,
    });
    return NextResponse.json({ bundle });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create post." },
      { status: 500 },
    );
  }
}
