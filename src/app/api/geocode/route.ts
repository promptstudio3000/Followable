import { NextRequest, NextResponse } from "next/server";
import { forwardGeocode, reverseGeocode } from "@/server/geocoding/service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (query) {
    const results = await forwardGeocode(query);
    return NextResponse.json({ results });
  }

  if (lat && lng) {
    const result = await reverseGeocode(Number(lat), Number(lng));
    return NextResponse.json({ result });
  }

  return NextResponse.json({ results: [] });
}
