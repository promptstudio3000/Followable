import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { createSession } from "@/lib/session";
import { walletVerifySchema } from "@/lib/validation";
import { walletAuthEnabled } from "@/lib/web3-config";
import { findOrCreateWalletUser } from "@/server/data/social";

const NONCE_COOKIE = "followable_wallet_nonce";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!walletAuthEnabled()) {
    return NextResponse.json({ error: "Wallet auth requires database configuration." }, { status: 400 });
  }

  const parsed = walletVerifySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid wallet auth payload." }, { status: 400 });
  }

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) {
    return NextResponse.json({ error: "Unable to resolve request host for SIWE verification." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const nonce = cookieStore.get(NONCE_COOKIE)?.value;

  if (!nonce) {
    return NextResponse.json({ error: "Wallet auth nonce is missing or expired." }, { status: 400 });
  }

  try {
    const message = new SiweMessage(parsed.data.message);
    await message.verify({
      signature: parsed.data.signature,
      nonce,
      domain: host,
    });

    const user = await findOrCreateWalletUser(message.address);
    await createSession(user.id);
    cookieStore.delete(NONCE_COOKIE);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet signature verification failed." },
      { status: 400 },
    );
  }
}
