"use client";

import { useState } from "react";
import { SiweMessage } from "siwe";
import { WalletCards } from "@/components/icons";
import { signWalletMessage, requestWalletConnection } from "@/lib/wallet-client";
import { useDemoStore } from "@/components/providers/demo-store-provider";

export function WalletSignInCard({ next }: { next?: string }) {
  const { featureModes } = useDemoStore();
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWalletSignIn = async () => {
    setError(null);
    setIsWorking(true);

    try {
      const connection = await requestWalletConnection();
      const nonceResponse = await fetch("/api/auth/wallet/nonce", {
        method: "GET",
        cache: "no-store",
      });

      if (!nonceResponse.ok) {
        const payload = (await nonceResponse.json()) as { error?: string };
        throw new Error(payload.error || "Unable to start wallet sign-in.");
      }

      const noncePayload = (await nonceResponse.json()) as { nonce: string };
      const chainId = connection.chainId ? Number.parseInt(connection.chainId, 16) : 1;

      const message = new SiweMessage({
        domain: window.location.host,
        address: connection.address,
        statement: "Sign in to Followable Hidden-Location Platform.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce: noncePayload.nonce,
        issuedAt: new Date().toISOString(),
      }).prepareMessage();

      const signature = await signWalletMessage(message, connection.address);

      const verifyResponse = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          signature,
        }),
      });

      if (!verifyResponse.ok) {
        const payload = (await verifyResponse.json()) as { error?: string };
        throw new Error(payload.error || "Wallet verification failed.");
      }

      window.location.assign(next || "/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Wallet sign-in failed.");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(27,24,19,0.08)]">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
        <WalletCards className="h-4 w-4" /> Wallet sign-in
      </div>
      <div className="mt-3 text-sm leading-7 text-stone-600">
        {featureModes.walletAuthStatus === "enabled"
          ? "Use MetaMask or Rabby to sign a SIWE message and create a real session tied to a wallet-backed user profile."
          : "Wallet sign-in is ready in code, but it needs DATABASE_URL before new wallet users can be created safely."}
      </div>
      <button
        type="button"
        onClick={() => void handleWalletSignIn()}
        disabled={isWorking || featureModes.walletAuthStatus !== "enabled"}
        className="mt-5 inline-flex min-h-12 items-center rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isWorking ? "Signing with wallet..." : "Sign in with wallet"}
      </button>
      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
