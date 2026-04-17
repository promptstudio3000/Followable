"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HardDriveUpload, MapPinned, ShieldBan, WalletCards } from "@/components/icons";
import { useDemoStore } from "@/components/providers/demo-store-provider";
import { creatorSubscriptionLabel } from "@/lib/discovery";
import { shortenWalletAddress } from "@/lib/wallet";
import { getChainConfig } from "@/lib/web3-config";

export function SettingsView() {
  const {
    snapshot,
    viewer,
    viewerId,
    localState,
    featureModes,
    walletConnection,
    connectWallet,
    disconnectWallet,
  } = useDemoStore();
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  const blockedUsers = useMemo(
    () => snapshot.users.filter((user) => localState.blockedUserIds.includes(user.id)),
    [localState.blockedUserIds, snapshot.users],
  );

  const subscriptions = useMemo(
    () => snapshot.users.filter((user) => localState.subscriptionCreatorIds.includes(user.id)),
    [localState.subscriptionCreatorIds, snapshot.users],
  );
  const chainConfig = useMemo(() => getChainConfig(), []);

  if (!viewer || !viewerId) {
    return (
      <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-10 text-center shadow-sm backdrop-blur-md">
        <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[color:var(--foreground)]">
          Přihlaste se pro nastavení účtu
        </div>
        <p className="mt-3 text-stone-600 dark:text-stone-400">
          Blokovaní uživatelé, peněženka a předplatná jsou vázaná na aktivní relaci.
        </p>
        <Link
          href="/sign-in?next=/settings"
          className="mt-5 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-950"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  const handleConnectWallet = async () => {
    setWalletError(null);
    setIsConnectingWallet(true);
    try {
      const connection = await connectWallet();
      if (!connection) {
        setWalletError("No injected wallet was detected. Open Rabby or MetaMask first.");
      }
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Wallet connection failed.");
    } finally {
      setIsConnectingWallet(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 shadow-sm backdrop-blur-md">
        <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Účet</div>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[color:var(--foreground)]">
          {viewer.displayName}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600 dark:text-stone-400">{viewer.bio}</p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-4">
          <Panel
            icon={ShieldBan}
            title="Blocked users"
            description="Safety controls stay lightweight, but content from blocked authors is hidden from your discovery surfaces."
          >
            <div className="grid gap-3">
              {blockedUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] p-5 text-sm text-stone-500 dark:text-stone-400">
                  V této relaci nemáte nikoho zablokovaného.
                </div>
              ) : (
                blockedUsers.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-[color:var(--glass-border)] bg-white/40 p-4 dark:bg-white/5">
                    <div className="font-medium text-[color:var(--foreground)]">{user.displayName}</div>
                    <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{user.bio}</div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            icon={WalletCards}
            title="Wallet auth and payments"
            description="SIWE login and wallet payments now run against the configured EVM chain. MetaMask and Rabby are both supported through the injected provider flow."
          >
            <div className="flex flex-wrap items-center gap-2">
              {walletConnection ? (
                <>
                  <div className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-950">
                    Connected: {shortenWalletAddress(walletConnection.address)}
                  </div>
                  <div className="rounded-full border border-[color:var(--glass-border)] px-3 py-2 text-sm text-stone-600 dark:text-stone-400">
                    {walletConnection.provider} {walletConnection.chainId ? `· ${walletConnection.chainId}` : ""}
                  </div>
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className="min-h-12 rounded-full border border-[color:var(--glass-border)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]"
                  >
                    Disconnect wallet
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleConnectWallet()}
                  disabled={isConnectingWallet}
                  className="min-h-12 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isConnectingWallet ? "Connecting wallet..." : "Connect Rabby or MetaMask"}
                </button>
              )}
            </div>
            {walletError ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {walletError}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.94fr_1.06fr]">
              <div className="rounded-2xl border border-[color:var(--glass-border)] bg-stone-100/40 p-4 dark:bg-stone-900/40">
                <div className="text-sm font-medium text-[color:var(--foreground)]">Konfigurace sítě</div>
                <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  Wallet purchases are quoted from CZK prices into either ETH or USDC on the currently configured chain.
                </div>
                <div className="mt-4 space-y-2 text-sm text-stone-700 dark:text-stone-300">
                  <div>Wallet auth: {featureModes.walletAuthStatus}</div>
                  <div>Payments: {featureModes.walletPaymentsEnabled ? "enabled" : "disabled"}</div>
                  <div>Chain: {chainConfig.chainName}</div>
                  <div>USDC: {chainConfig.usdcAddress ?? "Set NEXT_PUBLIC_USDC_ADDRESS"}</div>
                  <div>Recipient: {process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS ?? "Set NEXT_PUBLIC_PAYMENT_RECIPIENT_ADDRESS"}</div>
                  <div>Linked wallet on profile: {viewer.walletAddress ?? "none"}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-stone-100">
                <div className="flex items-center gap-2 text-sm font-medium text-stone-300">
                  <MapPinned className="h-4 w-4" /> Live wallet flow
                </div>
                <div className="mt-3 space-y-3 text-sm leading-7 text-stone-200/88">
                  <p>1. User signs in with SIWE or connects an injected wallet.</p>
                  <p>2. Server quotes creator subscription or hidden-place unlock into ETH or USDC.</p>
                  <p>3. Client sends the transaction through the wallet on the configured chain.</p>
                  <p>4. Server verifies the receipt and grants a durable entitlement in Postgres.</p>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            icon={HardDriveUpload}
            title="Subscriptions and creator access"
            description="Entitlements stay separated into creator-level subscriptions and post-level unlocks, even before live checkout exists."
          >
            <div className="grid gap-3">
              {subscriptions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--glass-border)] p-5 text-sm text-stone-500 dark:text-stone-400">
                  Žádná aktivní předplatná v této demo relaci.
                </div>
              ) : (
                subscriptions.map((user) => (
                  <div key={user.id} className="rounded-2xl border border-[color:var(--glass-border)] bg-white/40 p-4 dark:bg-white/5">
                    <div className="font-medium text-[color:var(--foreground)]">{user.displayName}</div>
                    <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                      {creatorSubscriptionLabel(snapshot, user.id)}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-[color:var(--glass-border)] bg-stone-100/30 p-4 text-sm leading-7 text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
              This keeps the discovery logic stable no matter whether future checkout comes from Stripe, a wallet flow, or both in parallel.
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-5 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-500 dark:text-stone-400">
        <Icon className="h-4 w-4" /> {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">{description}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
