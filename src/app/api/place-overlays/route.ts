import { NextResponse } from "next/server";
import { getAppBootstrap } from "@/server/data/bootstrap";
import { listPlaceOverlays } from "@/server/data/place-overlay";

function parseMultiValue(searchParams: URLSearchParams, key: string) {
  return searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const placeIds = parseMultiValue(url.searchParams, "placeId");
  const placeKeys = parseMultiValue(url.searchParams, "placeKey");
  const updatedAfter = url.searchParams.get("updatedAfter");
  const rawLimit = url.searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : null;

  if (updatedAfter) {
    const updatedAfterTimestamp = new Date(updatedAfter).getTime();
    if (Number.isNaN(updatedAfterTimestamp)) {
      return NextResponse.json({ error: "updatedAfter must be a valid ISO timestamp." }, { status: 400 });
    }
  }

  if (rawLimit) {
    const requestedLimit = Number(rawLimit);
    if (!Number.isFinite(requestedLimit) || !Number.isInteger(requestedLimit) || requestedLimit <= 0) {
      return NextResponse.json({ error: "limit must be a positive integer." }, { status: 400 });
    }
  }

  const { snapshot, featureModes } = await getAppBootstrap();
  const payload = listPlaceOverlays(snapshot, featureModes.appMode, {
    placeIds,
    placeKeys,
    updatedAfter,
    limit: parsedLimit,
  });

  return NextResponse.json(payload);
}
