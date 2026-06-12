import { NextRequest, NextResponse } from "next/server";
import { fetchSongMetadata } from "@/lib/metadata";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url?.trim()) {
    return NextResponse.json(
      { error: "url parameter is required" },
      { status: 400 }
    );
  }

  const metadata = await fetchSongMetadata(url);

  if (!metadata) {
    return NextResponse.json(
      { error: "Could not fetch metadata. Only YouTube and Spotify URLs are supported." },
      { status: 404 }
    );
  }

  return NextResponse.json(metadata);
}
