"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LoaderCircle, WalletCards } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { sendQuotedPayment, switchWalletToConfiguredChain } from "@/lib/wallet-client";
import type { PaymentAsset, PaymentQuote } from "@/lib/types";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function WalletPurchaseControls({
  targetType,
  creatorId,
  postId,
  compact = false,
}: {
  targetType: "subscription" | "special_unlock";
  creatorId?: string | null;
  postId?: string | null;
  compact?: boolean;
}) {
  const { viewerId, walletConnection, connectWallet, refreshSnapshot, featureModes } = useDemoStore();
  const [activeAsset, setActiveAsset] = useState<PaymentAsset | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      targetType === "subscription"
        ? {
            title: "Subscribe in wallet",
            description: "Pay the creator subscription with ETH or USDC and unlock all subscriber-only drops from this creator.",
          }
        : {
            title: "Unlock in wallet",
            description: "Pay this hidden place directly from your wallet and grant a post-level entitlement after onchain verification.",
          },
    [targetType],
  );

  const startPayment = async (asset: PaymentAsset) => {
    if (!viewerId) return;

    setActiveAsset(asset);
    setError(null);
    setStatusText("Preparing wallet quote...");

    try {
      const connection = walletConnection ?? (await connectWallet());
      if (!connection?.address) {
        throw new Error("Connect a wallet first.");
      }

      const quoteResponse = await fetch("/api/payments/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset,
          targetType,
          creatorId: creatorId ?? null,
          postId: postId ?? null,
        }),
      });

      const quotePayload = (await quoteResponse.json()) as { quote?: PaymentQuote; error?: string };
      if (!quoteResponse.ok || !quotePayload.quote) {
        throw new Error(quotePayload.error || "Unable to create a payment quote.");
      }

      setStatusText(`Switching wallet to ${quotePayload.quote.chainName}...`);
      await switchWalletToConfiguredChain();

      setStatusText(`Sending ${quotePayload.quote.amountDisplay}...`);
      const txHash = await sendQuotedPayment(quotePayload.quote, connection.address);

      setStatusText("Waiting for onchain confirmation...");

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const confirmResponse = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset,
            targetType,
            creatorId: creatorId ?? null,
            postId: postId ?? null,
            txHash,
            walletAddress: connection.address,
          }),
        });

        if (confirmResponse.status === 202) {
          await sleep(3000);
          continue;
        }

        const confirmPayload = (await confirmResponse.json()) as {
          status?: "confirmed" | "failed";
          error?: string;
        };

        if (!confirmResponse.ok || confirmPayload.status === "failed") {
          throw new Error(confirmPayload.error || "Payment verification failed.");
        }

        await refreshSnapshot();
        setStatusText("Access unlocked.");
        return;
      }

      throw new Error("Transaction is still pending. Check your block explorer and retry in a moment.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Wallet payment failed.");
      setStatusText(null);
    } finally {
      setActiveAsset(null);
    }
  };

  if (!featureModes.walletPaymentsEnabled) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs leading-6 text-stone-600">
        Wallet payments are coded, but they need chain and recipient env vars before they can run live.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-amber-900/85">
        <div className="font-semibold text-amber-950">{copy.title}</div>
        <div className="mt-1">{copy.description}</div>
      </div>

      {!viewerId ? (
        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
        >
          Sign in first
        </Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["eth", "usdc"] as PaymentAsset[]).map((asset) => (
            <button
              key={asset}
              type="button"
              onClick={() => void startPayment(asset)}
              disabled={Boolean(activeAsset)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                compact
                  ? "border border-stone-300 bg-white text-stone-900"
                  : "bg-stone-950 text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {activeAsset === asset ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
                {targetType === "subscription" ? "Subscribe" : "Unlock"} with {asset.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}

      {statusText ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-950">
          {statusText}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
