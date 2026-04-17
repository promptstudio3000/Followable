import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { generateNonce } from "siwe";
import { walletAuthEnabled } from "@/lib/web3-config";

const NONCE_COOKIE = "followable_wallet_nonce";

export const runtime = "nodejs";

export async function GET() {
  if (!walletAuthEnabled()) {
    return NextResponse.json({ error: "Wallet auth requires database configuration." }, { status: 400 });
  }

  const nonce = generateNonce();
  const cookieStore = await cookies();
  cookieStore.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
  });

  return NextResponse.json({ nonce });
}
