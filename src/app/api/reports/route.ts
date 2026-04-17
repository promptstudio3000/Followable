import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { createReportSchema } from "@/lib/validation";
import { createDatabaseReport } from "@/server/data/social";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createReportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid report payload." }, { status: 400 });
  }

  try {
    const result = await createDatabaseReport({
      viewerId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ report: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create report." },
      { status: 500 },
    );
  }
}
