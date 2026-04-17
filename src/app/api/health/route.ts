import { NextResponse } from "next/server";
import { seedData } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({
    ok: true,
    posts: seedData.posts.length,
    creators: seedData.users.length,
    topics: seedData.topics.length,
    collections: seedData.collections.length,
    mode: process.env.DATABASE_URL ? "database-ready" : "demo-seeded",
  });
}
