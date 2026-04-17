import { NextResponse } from "next/server";
import { getAppBootstrap } from "@/server/data/bootstrap";
import { getPlaceOverlayByKey } from "@/server/data/place-overlay";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeKey: string[] }> },
) {
  const { placeKey } = await context.params;
  const normalizedPlaceKey = placeKey.map((segment) => decodeURIComponent(segment)).join("/");
  const { snapshot, featureModes } = await getAppBootstrap();
  const overlay = getPlaceOverlayByKey(snapshot, featureModes.appMode, normalizedPlaceKey);

  if (!overlay) {
    return NextResponse.json({ error: "Place overlay not found." }, { status: 404 });
  }

  return NextResponse.json(overlay);
}
