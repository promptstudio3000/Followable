import { and, eq } from "drizzle-orm";
import { createPublicClient, decodeEventLog, getAddress, http } from "viem";
import { seedData } from "@/lib/demo-data";
import { paymentExplorerUrl, quoteFromCzk, erc20Abi } from "@/lib/payments";
import type { PaymentQuote, PaymentRecord } from "@/lib/types";
import { getChainConfig } from "@/lib/web3-config";
import { getDatabase } from "@/server/db/client";
import { getDatabaseSnapshot } from "@/server/data/database";
import { entitlements, payments, posts, profileSubscriptions, users } from "@/server/db/schema";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function normalizeAddress(address: string) {
  return getAddress(address).toLowerCase();
}

async function currentSnapshot() {
  if (process.env.DATABASE_URL) {
    return getDatabaseSnapshot();
  }

  return seedData;
}

export async function createQuote(input: {
  asset: "eth" | "usdc";
  targetType: "subscription" | "special_unlock";
  creatorId?: string | null;
  postId?: string | null;
}): Promise<PaymentQuote> {
  const snapshot = await currentSnapshot();

  if (input.targetType === "subscription") {
    const creator = snapshot.users.find((entry) => entry.id === input.creatorId);
    if (!creator || !creator.subscriptionPriceCzk) {
      throw new Error("Creator subscription price was not found.");
    }

    return quoteFromCzk({
      priceCzk: creator.subscriptionPriceCzk,
      asset: input.asset,
      target: {
        type: "subscription",
        creatorId: creator.id,
        postId: null,
      },
    });
  }

  const post = snapshot.posts.find((entry) => entry.id === input.postId);
  if (!post || !post.specialPrice || !post.authorId) {
    throw new Error("Hidden-place unlock price was not found.");
  }

  return quoteFromCzk({
    priceCzk: post.specialPrice,
    asset: input.asset,
    target: {
      type: "special_unlock",
      creatorId: post.authorId,
      postId: post.id,
    },
  });
}

export async function confirmQuotePayment(input: {
  viewerId: string;
  walletAddress: string;
  txHash: string;
  quote: PaymentQuote;
}): Promise<
  | { status: "pending" }
  | { status: "failed"; reason: string }
  | { status: "confirmed"; payment: PaymentRecord }
> {
  const { db } = getDatabase();
  const normalizedWallet = normalizeAddress(input.walletAddress);
  const normalizedRecipient = normalizeAddress(input.quote.recipientAddress);

  const existingPayment = await db
    .select()
    .from(payments)
    .where(eq(payments.txHash, input.txHash))
    .limit(1);

  if (existingPayment[0]?.status === "confirmed") {
    return {
      status: "confirmed",
      payment: {
        ...existingPayment[0],
        creatorId: existingPayment[0].creatorId ?? null,
        postId: existingPayment[0].postId ?? null,
        tokenAddress: existingPayment[0].tokenAddress ?? null,
        explorerUrl: existingPayment[0].explorerUrl ?? null,
        createdAt: existingPayment[0].createdAt.toISOString(),
        updatedAt: existingPayment[0].updatedAt.toISOString(),
      },
    };
  }

  const chainConfig = getChainConfig(input.quote.chainId);
  if (!chainConfig.rpcUrl) {
    throw new Error("Wallet RPC URL is not configured.");
  }

  const client = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });

  let receipt;
  let transaction;
  try {
    receipt = await client.getTransactionReceipt({ hash: input.txHash as `0x${string}` });
    transaction = await client.getTransaction({ hash: input.txHash as `0x${string}` });
  } catch {
    return { status: "pending" };
  }

  if (receipt.status !== "success") {
    return { status: "failed", reason: "Transaction reverted onchain." };
  }

  const txFrom = normalizeAddress(transaction.from);

  if (txFrom !== normalizedWallet) {
    return { status: "failed", reason: "Transaction sender does not match connected wallet." };
  }

  if (input.quote.asset === "eth") {
    const txTo = transaction.to ? normalizeAddress(transaction.to) : null;
    if (txTo !== normalizedRecipient) {
      return { status: "failed", reason: "Transaction recipient does not match the configured receiver." };
    }

    if (transaction.value < BigInt(input.quote.amountAtomic)) {
      return { status: "failed", reason: "Transferred ETH amount is lower than the quoted amount." };
    }
  } else {
    const tokenAddress = input.quote.tokenAddress ? normalizeAddress(input.quote.tokenAddress) : null;
    if (!tokenAddress) {
      return { status: "failed", reason: "USDC token address is missing." };
    }

    const matchingTransfer = receipt.logs.find((log) => {
      if (normalizeAddress(log.address) !== tokenAddress) return false;

      try {
        const decoded = decodeEventLog({
          abi: erc20Abi,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName !== "Transfer") return false;

        const from = normalizeAddress(String(decoded.args.from));
        const to = normalizeAddress(String(decoded.args.to));
        const value = BigInt(String(decoded.args.value));

        return (
          from === normalizedWallet &&
          to === normalizedRecipient &&
          value >= BigInt(input.quote.amountAtomic)
        );
      } catch {
        return false;
      }
    });

    if (!matchingTransfer) {
      return {
        status: "failed",
        reason: "No matching USDC transfer was found in the confirmed transaction.",
      };
    }
  }

  const viewer = await db.select({ id: users.id }).from(users).where(eq(users.id, input.viewerId)).limit(1);
  if (!viewer[0]) {
    return { status: "failed", reason: "Authenticated user was not found." };
  }

  const now = new Date();
  const paymentRecord = {
    id: existingPayment[0]?.id ?? createId("payment"),
    userId: input.viewerId,
    creatorId: input.quote.target.creatorId ?? null,
    postId: input.quote.target.postId ?? null,
    walletAddress: normalizedWallet,
    chainId: input.quote.chainId,
    asset: input.quote.asset,
    recipientAddress: normalizedRecipient,
    tokenAddress: input.quote.tokenAddress ? normalizeAddress(input.quote.tokenAddress) : null,
    amountAtomic: input.quote.amountAtomic,
    amountDisplay: input.quote.amountDisplay,
    txHash: input.txHash,
    status: "confirmed" as const,
    targetType: input.quote.target.type,
    explorerUrl: paymentExplorerUrl(input.txHash),
    createdAt: existingPayment[0]?.createdAt ?? now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    if (existingPayment[0]) {
      await tx
        .update(payments)
        .set(paymentRecord)
        .where(eq(payments.id, existingPayment[0].id));
    } else {
      await tx.insert(payments).values(paymentRecord);
    }

    if (input.quote.target.type === "subscription" && input.quote.target.creatorId) {
      const existingSubscription = await tx
        .select({ id: profileSubscriptions.id })
        .from(profileSubscriptions)
        .where(
          and(
            eq(profileSubscriptions.subscriberId, input.viewerId),
            eq(profileSubscriptions.creatorId, input.quote.target.creatorId),
            eq(profileSubscriptions.status, "active"),
          ),
        )
        .limit(1);

      if (!existingSubscription[0]) {
        await tx.insert(profileSubscriptions).values({
          id: createId("subscription"),
          subscriberId: input.viewerId,
          creatorId: input.quote.target.creatorId,
          status: "active",
          startedAt: now,
          expiresAt: null,
          paymentProvider: "wallet",
          createdAt: now,
          updatedAt: now,
        });
      }

      const existingEntitlement = await tx
        .select({ id: entitlements.id })
        .from(entitlements)
        .where(
          and(
            eq(entitlements.userId, input.viewerId),
            eq(entitlements.creatorId, input.quote.target.creatorId),
            eq(entitlements.type, "subscription"),
            eq(entitlements.status, "active"),
          ),
        )
        .limit(1);

      if (!existingEntitlement[0]) {
        await tx.insert(entitlements).values({
          id: createId("entitlement"),
          userId: input.viewerId,
          creatorId: input.quote.target.creatorId,
          postId: null,
          type: "subscription",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (input.quote.target.type === "special_unlock" && input.quote.target.postId) {
      const existingUnlock = await tx
        .select({ id: entitlements.id })
        .from(entitlements)
        .where(
          and(
            eq(entitlements.userId, input.viewerId),
            eq(entitlements.postId, input.quote.target.postId),
            eq(entitlements.type, "special_unlock"),
            eq(entitlements.status, "active"),
          ),
        )
        .limit(1);

      if (!existingUnlock[0]) {
        const targetPost = await tx
          .select({ authorId: posts.authorId })
          .from(posts)
          .where(eq(posts.id, input.quote.target.postId))
          .limit(1);

        await tx.insert(entitlements).values({
          id: createId("entitlement"),
          userId: input.viewerId,
          creatorId: targetPost[0]?.authorId ?? input.quote.target.creatorId ?? null,
          postId: input.quote.target.postId,
          type: "special_unlock",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  });

  return {
    status: "confirmed",
    payment: {
      ...paymentRecord,
      createdAt: paymentRecord.createdAt.toISOString(),
      updatedAt: paymentRecord.updatedAt.toISOString(),
    },
  };
}
