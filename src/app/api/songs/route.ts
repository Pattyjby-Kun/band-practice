import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { getSongsByFolderId, createSong, getFolderById } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const folderId = request.nextUrl.searchParams.get("folder_id");
    const sortBy =
      request.nextUrl.searchParams.get("sort") === "votes" ? "votes" : "order";

    if (!folderId) {
      return NextResponse.json(
        { error: "folder_id is required" },
        { status: 400 }
      );
    }

    const songs = await getSongsByFolderId(folderId, sortBy);
    return NextResponse.json(songs);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const {
      folder_id,
      song_name,
      song_url,
      cover_image,
      chord_url,
      drum_note_url,
      bass_note_url,
      notes,
    } = body;

    if (!folder_id || !(await getFolderById(String(folder_id), auth.client))) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }

    const folder = await getFolderById(String(folder_id), auth.client);

    if (!song_name?.trim()) {
      return NextResponse.json(
        { error: "Song name is required" },
        { status: 400 }
      );
    }
    if (!song_url?.trim()) {
      return NextResponse.json(
        { error: "Song URL is required" },
        { status: 400 }
      );
    }

    const song = await createSong(
      {
        folder_id: String(folder_id),
        song_name: song_name.trim(),
        song_url: song_url.trim(),
        cover_image: cover_image || null,
        chord_url: chord_url?.trim() || null,
        drum_note_url: drum_note_url?.trim() || null,
        bass_note_url: bass_note_url?.trim() || null,
        notes: notes?.trim() || null,
      },
      auth.client
    );

    if (folder?.band_id) {
      await logBandActivity(auth.client, {
        bandId: folder.band_id,
        actorUserId: auth.user.id,
        action: BAND_ACTIVITY_ACTIONS.ADD_SONG,
        metadata: {
          song_id: song.id,
          song_name: song.song_name,
          folder_id: folder.id,
          folder_name: folder.name,
        },
      });
    }

    return NextResponse.json(song, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create song" },
      { status: 500 }
    );
  }
}
