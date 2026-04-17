import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { paymentQuoteSchema } from "@/lib/validation";
import { createQuote } from "@/server/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paymentQuoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payment quote payload." }, { status: 400 });
  }

  try {
    const quote = await createQuote({
      asset: parsed.data.asset,
      targetType: parsed.data.targetType,
      creatorId: parsed.data.creatorId ?? null,
      postId: parsed.data.postId ?? null,
    });
    return NextResponse.json({ quote });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to build payment quote." },
      { status: 400 },
    );
  }
}
