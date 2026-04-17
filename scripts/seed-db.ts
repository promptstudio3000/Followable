import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getAdminDivisionSeedRecords } from "@/server/data/admin-divisions";
import { loadEnvLocal } from "./load-env-local";

loadEnvLocal();
import {
  blockedUsers,
  adminDivisions,
  collectionPosts,
  collectionUsers,
  collections,
  comments,
  entitlements,
  follows,
  locations,
  payments,
  postMedia,
  postTags,
  posts,
  profileSubscriptions,
  reactions,
  reports,
  savedPosts,
  topics,
  users,
} from "@/server/db/schema";

function toDate(value: string) {
  return new Date(value);
}

function toNullableDate(value: string | null) {
  return value ? new Date(value) : null;
}

async function insertInChunks<T>(values: T[], insert: (chunk: T[]) => Promise<unknown>, chunkSize = 5_000) {
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    await insert(values.slice(offset, offset + chunkSize));
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for db:seed. Set it in .env.local (e.g. DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/followable). " +
        "To run the app without a database, leave DATABASE_URL unset and use npm run dev (demo mode).",
    );
  }

  console.info("[followable] db:seed — building in-memory demo snapshot (can take ~1–2 min)…");
  const { seedData } = await import("@/lib/demo-data");
  console.info("[followable] db:seed — writing to Postgres…");

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  await db.transaction(async (tx) => {
    await tx.delete(reports);
    await tx.delete(payments);
    await tx.delete(blockedUsers);
    await tx.delete(savedPosts);
    await tx.delete(comments);
    await tx.delete(reactions);
    await tx.delete(postMedia);
    await tx.delete(postTags);
    await tx.delete(entitlements);
    await tx.delete(profileSubscriptions);
    await tx.delete(collectionPosts);
    await tx.delete(collectionUsers);
    await tx.delete(posts);
    await tx.delete(locations);
    await tx.delete(collections);
    await tx.delete(topics);
    await tx.delete(follows);
    await tx.delete(adminDivisions);
    await tx.delete(users);
  });

  const adminDivisionSeed = getAdminDivisionSeedRecords();
  if (adminDivisionSeed.length > 0) {
    console.info(
      `[followable] db:seed — inserting ${adminDivisionSeed.length.toLocaleString("cs-CZ")} admin division rows (chunked commits)…`,
    );
    await insertInChunks(
      adminDivisionSeed,
      async (chunk) => {
        await db.insert(adminDivisions).values(chunk);
      },
      2_500,
    );
  }

  await db.transaction(async (tx) => {
    await tx.insert(users).values(
      seedData.users.map((u) => ({
        ...u,
        createdAt: toDate(u.createdAt),
        updatedAt: toDate(u.updatedAt),
      })),
    );
    await tx.insert(follows).values(
      seedData.follows.map((f) => ({
        ...f,
        createdAt: toDate(f.createdAt),
      })),
    );
    await tx.insert(topics).values(
      seedData.topics.map((t) => ({
        ...t,
        createdAt: toDate(t.createdAt),
        updatedAt: toDate(t.updatedAt),
      })),
    );
    await tx.insert(collections).values(
      seedData.collections.map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
      })),
    );
    await tx.insert(locations).values(
      seedData.locations.map((l) => ({
        ...l,
        createdAt: toDate(l.createdAt),
        updatedAt: toDate(l.updatedAt),
      })),
    );
    await tx.insert(posts).values(
      seedData.posts.map((post) => ({
        ...post,
        visibilityStart: toNullableDate(post.visibilityStart),
        visibilityEnd: toNullableDate(post.visibilityEnd),
        specialPrice: post.specialPrice != null ? String(post.specialPrice) : null,
        createdAt: toDate(post.createdAt),
        updatedAt: toDate(post.updatedAt),
      })),
    );
    await tx.insert(collectionUsers).values(seedData.collectionUsers);
    await tx.insert(collectionPosts).values(seedData.collectionPosts);
    await tx.insert(profileSubscriptions).values(
      seedData.subscriptions.map((s) => ({
        ...s,
        startedAt: toDate(s.startedAt),
        expiresAt: toNullableDate(s.expiresAt),
        createdAt: toDate(s.createdAt),
        updatedAt: toDate(s.updatedAt),
      })),
    );
    await tx.insert(entitlements).values(
      seedData.entitlements.map((e) => ({
        ...e,
        createdAt: toDate(e.createdAt),
        updatedAt: toDate(e.updatedAt),
      })),
    );
    if (seedData.payments.length > 0) {
      await tx.insert(payments).values(
        seedData.payments.map((p) => ({
          ...p,
          createdAt: toDate(p.createdAt),
          updatedAt: toDate(p.updatedAt),
        })),
      );
    }
    await tx.insert(postTags).values(seedData.postTags);
    await tx.insert(postMedia).values(seedData.postMedia);
    await tx.insert(reactions).values(
      seedData.reactions.map((r) => ({
        ...r,
        createdAt: toDate(r.createdAt),
      })),
    );
    await tx.insert(comments).values(
      seedData.comments.map((c) => ({
        ...c,
        createdAt: toDate(c.createdAt),
        updatedAt: toDate(c.updatedAt),
      })),
    );
    await tx.insert(savedPosts).values(
      seedData.savedPosts.map((s) => ({
        ...s,
        createdAt: toDate(s.createdAt),
      })),
    );
    await tx.insert(blockedUsers).values(
      seedData.blockedUsers.map((b) => ({
        ...b,
        createdAt: toDate(b.createdAt),
      })),
    );
    await tx.insert(reports).values(
      seedData.reports.map((r) => ({
        ...r,
        createdAt: toDate(r.createdAt),
        updatedAt: toDate(r.updatedAt),
      })),
    );
  });

  await client.end();
  console.info("[followable] db:seed — done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
