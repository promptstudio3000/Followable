import { and, eq } from "drizzle-orm";
import { getAddress } from "viem";
import type { ReactionType } from "@/lib/types";
import { getDatabase } from "@/server/db/client";
import {
  blockedUsers,
  follows,
  reactions,
  reports,
  savedPosts,
  users,
} from "@/server/db/schema";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function normalizeAddress(address: string) {
  return getAddress(address).toLowerCase();
}

export async function toggleDatabaseFollow(input: {
  viewerId: string;
  targetUserId: string;
}) {
  const { db } = getDatabase();

  const existing = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, input.viewerId), eq(follows.followedUserId, input.targetUserId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(follows).where(eq(follows.id, existing[0].id));
    return { following: false };
  }

  await db.insert(follows).values({
    id: createId("follow"),
    followerId: input.viewerId,
    followedUserId: input.targetUserId,
    createdAt: new Date(),
  });

  return { following: true };
}

export async function toggleDatabaseSave(input: {
  viewerId: string;
  postId: string;
}) {
  const { db } = getDatabase();

  const existing = await db
    .select({ id: savedPosts.id })
    .from(savedPosts)
    .where(and(eq(savedPosts.userId, input.viewerId), eq(savedPosts.postId, input.postId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(savedPosts).where(eq(savedPosts.id, existing[0].id));
    return { saved: false };
  }

  await db.insert(savedPosts).values({
    id: createId("saved"),
    userId: input.viewerId,
    postId: input.postId,
    createdAt: new Date(),
  });

  return { saved: true };
}

export async function toggleDatabaseReaction(input: {
  viewerId: string;
  postId: string;
  type: ReactionType;
}) {
  const { db } = getDatabase();

  const existing = await db
    .select({ id: reactions.id, type: reactions.type })
    .from(reactions)
    .where(and(eq(reactions.userId, input.viewerId), eq(reactions.postId, input.postId)))
    .limit(1);

  if (existing[0]?.type === input.type) {
    await db.delete(reactions).where(eq(reactions.id, existing[0].id));
    return { reaction: null };
  }

  if (existing[0]) {
    await db.delete(reactions).where(eq(reactions.id, existing[0].id));
  }

  await db.insert(reactions).values({
    id: createId("reaction"),
    userId: input.viewerId,
    postId: input.postId,
    type: input.type,
    createdAt: new Date(),
  });

  return { reaction: input.type };
}

export async function toggleDatabaseBlock(input: {
  viewerId: string;
  targetUserId: string;
}) {
  const { db } = getDatabase();

  const existing = await db
    .select({ id: blockedUsers.id })
    .from(blockedUsers)
    .where(
      and(
        eq(blockedUsers.blockerId, input.viewerId),
        eq(blockedUsers.blockedUserId, input.targetUserId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db.delete(blockedUsers).where(eq(blockedUsers.id, existing[0].id));
    return { blocked: false };
  }

  await db.insert(blockedUsers).values({
    id: createId("blocked"),
    blockerId: input.viewerId,
    blockedUserId: input.targetUserId,
    createdAt: new Date(),
  });

  return { blocked: true };
}

export async function createDatabaseReport(input: {
  viewerId: string;
  targetType: "post" | "user";
  targetId: string;
  reason: string;
}) {
  const { db } = getDatabase();
  const now = new Date();

  const report = {
    id: createId("report"),
    reporterId: input.viewerId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    status: "open" as const,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(reports).values(report);

  return {
    ...report,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function findOrCreateWalletUser(walletAddress: string) {
  const { db } = getDatabase();
  const normalizedAddress = normalizeAddress(walletAddress);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.walletAddress, normalizedAddress))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const baseUsername = `wallet-${normalizedAddress.slice(2, 8)}${normalizedAddress.slice(-4)}`;
  let nextUsername = baseUsername;
  let suffix = 1;

  for (;;) {
    const taken = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, nextUsername))
      .limit(1);
    if (!taken[0]) break;
    nextUsername = `${baseUsername}-${suffix}`;
    suffix += 1;
  }

  const now = new Date();
  const displayAddress = getAddress(normalizedAddress);
  const nextUser = {
    id: createId("user"),
    username: nextUsername,
    displayName: `Wallet ${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`,
    bio: "Wallet-native member using onchain sign-in and payments for access to map-first creator content.",
    avatarUrl: `https://api.dicebear.com/9.x/shapes/svg?seed=${normalizedAddress}`,
    homeRegion: null,
    focusTopicSlugs: [] as string[],
    subscriptionPriceCzk: null,
    walletAddress: normalizedAddress,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(nextUser);

  return nextUser;
}
