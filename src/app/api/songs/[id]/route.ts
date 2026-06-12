import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { getSongById, deleteSong, updateSong, getFolderById } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const song = await getSongById(id);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json(song);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch song" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const song = await getSongById(id);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      song_name,
      song_url,
      cover_image,
      chord_url,
      drum_note_url,
      bass_note_url,
      notes,
    } = body;

    if (song_name !== undefined && !song_name?.trim()) {
      return NextResponse.json(
        { error: "Song name cannot be empty" },
        { status: 400 }
      );
    }
    if (song_url !== undefined && !song_url?.trim()) {
      return NextResponse.json(
        { error: "Song URL cannot be empty" },
        { status: 400 }
      );
    }

    const updated = await updateSong(
      id,
      {
        song_name: song_name?.trim(),
        song_url: song_url?.trim(),
        cover_image,
        chord_url,
        drum_note_url,
        bass_note_url,
        notes,
      },
      auth.client
    );

    const folder = await getFolderById(song.folder_id, auth.client);
    if (folder?.band_id) {
      await logBandActivity(auth.client, {
        bandId: folder.band_id,
        actorUserId: auth.user.id,
        action: BAND_ACTIVITY_ACTIONS.EDIT_SONG,
        metadata: {
          song_id: updated.id,
          song_name: updated.song_name,
          folder_id: folder.id,
          folder_name: folder.name,
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update song" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const song = await getSongById(id);

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const folder = await getFolderById(song.folder_id, auth.client);

    await deleteSong(id, auth.client);

    if (folder?.band_id) {
      await logBandActivity(auth.client, {
        bandId: folder.band_id,
        actorUserId: auth.user.id,
        action: BAND_ACTIVITY_ACTIONS.DELETE_SONG,
        metadata: {
          song_id: song.id,
          song_name: song.song_name,
          folder_id: folder.id,
          folder_name: folder.name,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    );
  }
}
