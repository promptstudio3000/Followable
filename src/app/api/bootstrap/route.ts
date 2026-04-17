import { NextResponse } from "next/server";
import { getAppBootstrap } from "@/server/data/bootstrap";

export async function GET() {
  const payload = await getAppBootstrap();
  return NextResponse.json(payload);
}
