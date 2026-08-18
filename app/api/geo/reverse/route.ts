import { NextRequest, NextResponse } from "next/server";

import { reverseGeocode } from "@/lib/utils/geo";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { message: "Valid latitude and longitude are required." },
      { status: 400 },
    );
  }

  try {
    const result = await reverseGeocode(lat, lng);

    if (!result) {
      return NextResponse.json(
        { message: "Could not determine a postcode for that location." },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to look up postcode." },
      { status: 500 },
    );
  }
}
