import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { createCommentSchema } from "@/lib/validation";
import { createDatabaseComment } from "@/server/data/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = createCommentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid comment payload." }, { status: 400 });
  }

  try {
    const comment = await createDatabaseComment({
      viewerId,
      postId: parsed.data.postId,
      body: parsed.data.body,
      parentCommentId: parsed.data.parentCommentId ?? null,
    });
    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create comment." },
      { status: 500 },
    );
  }
}
