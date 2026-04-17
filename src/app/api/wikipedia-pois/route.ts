import { NextRequest, NextResponse } from "next/server";
import { loadWikipediaPoisForBounds } from "@/server/wikipedia/poi-service";

function parseNumber(value: string | null) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  const placeLabel = request.nextUrl.searchParams.get("placeLabel")?.trim() || null;
  const west = parseNumber(request.nextUrl.searchParams.get("west"));
  const south = parseNumber(request.nextUrl.searchParams.get("south"));
  const east = parseNumber(request.nextUrl.searchParams.get("east"));
  const north = parseNumber(request.nextUrl.searchParams.get("north"));

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required." }, { status: 400 });
  }

  if (west == null || south == null || east == null || north == null) {
    return NextResponse.json({ error: "west, south, east and north are required." }, { status: 400 });
  }

  try {
    const items = await loadWikipediaPoisForBounds({
      placeId,
      placeLabel,
      bounds: { west, south, east, north },
    });

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch {
    return NextResponse.json({ error: "Wikipedia POI load failed." }, { status: 502 });
  }
}
