import { NextRequest, NextResponse } from "next/server";
import { loadWikipediaPoiDetail } from "@/server/wikipedia/poi-service";

type RouteContext = {
  params: Promise<{
    pageId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const pageId = Number(params.pageId);

  if (!Number.isInteger(pageId) || pageId <= 0) {
    return NextResponse.json({ error: "Valid Wikipedia pageId is required." }, { status: 400 });
  }

  try {
    const item = await loadWikipediaPoiDetail(pageId);
    return NextResponse.json({ item });
  } catch {
    return NextResponse.json({ error: "Wikipedia POI detail load failed." }, { status: 502 });
  }
}
