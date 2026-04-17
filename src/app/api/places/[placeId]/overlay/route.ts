import { NextResponse } from "next/server";
import { getAppBootstrap } from "@/server/data/bootstrap";
import { getPlaceOverlayById } from "@/server/data/place-overlay";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  const { snapshot, featureModes } = await getAppBootstrap();
  const overlay = getPlaceOverlayById(snapshot, featureModes.appMode, placeId);

  if (!overlay) {
    return NextResponse.json({ error: "Place overlay not found." }, { status: 404 });
  }

  return NextResponse.json(overlay);
}
