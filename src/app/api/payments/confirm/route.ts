import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { paymentConfirmSchema } from "@/lib/validation";
import { confirmQuotePayment, createQuote } from "@/server/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewerId = await getSessionUserId();
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = paymentConfirmSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payment confirmation payload." }, { status: 400 });
  }

  try {
    const quote = await createQuote({
      asset: parsed.data.asset,
      targetType: parsed.data.targetType,
      creatorId: parsed.data.creatorId ?? null,
      postId: parsed.data.postId ?? null,
    });

    const result = await confirmQuotePayment({
      viewerId,
      walletAddress: parsed.data.walletAddress,
      txHash: parsed.data.txHash,
      quote,
    });

    if (result.status === "failed") {
      return NextResponse.json({ status: "failed", error: result.reason }, { status: 400 });
    }

    return NextResponse.json(result, {
      status: result.status === "pending" ? 202 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to confirm payment." },
      { status: 500 },
    );
  }
}
