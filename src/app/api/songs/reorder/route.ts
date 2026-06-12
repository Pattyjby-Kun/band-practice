import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { reorderSongs, getFolderById } from "@/lib/db";

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { folder_id, song_ids } = body;

    if (!folder_id || !(await getFolderById(String(folder_id), auth.client))) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    if (!Array.isArray(song_ids) || song_ids.length === 0) {
      return NextResponse.json(
        { error: "song_ids array is required" },
        { status: 400 }
      );
    }

    await reorderSongs(
      String(folder_id),
      song_ids.map((id: unknown) => String(id)),
      auth.client
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to reorder songs" },
      { status: 500 }
    );
  }
}
