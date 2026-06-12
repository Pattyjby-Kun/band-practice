import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFolderBandMember } from "@/lib/auth-api";
import {
  deleteFolderMedia,
  getFolderMediaById,
  isValidMediaType,
  updateFolderMedia,
} from "@/lib/folder-media";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: mediaId } = await params;
    const existing = await getFolderMediaById(auth.client, mediaId);

    if (!existing) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const accessCheck = await requireFolderBandMember(
      auth.client,
      existing.folder_id,
      auth.user.id
    );
    if ("error" in accessCheck) return accessCheck.error;

    const body = await request.json();
    const { title, url, media_type, notes } = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    }
    if (url !== undefined && !url?.trim()) {
      return NextResponse.json({ error: "URL cannot be empty" }, { status: 400 });
    }
    if (media_type !== undefined && !isValidMediaType(String(media_type))) {
      return NextResponse.json(
        { error: "media_type must be google_drive, youtube, or other" },
        { status: 400 }
      );
    }

    const updated = await updateFolderMedia(auth.client, mediaId, {
      title: title !== undefined ? String(title) : undefined,
      url: url !== undefined ? String(url) : undefined,
      media_type: media_type !== undefined ? media_type : undefined,
      notes: notes !== undefined ? notes : undefined,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update media" },
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

    const { id: mediaId } = await params;
    const existing = await getFolderMediaById(auth.client, mediaId);

    if (!existing) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const accessCheck = await requireFolderBandMember(
      auth.client,
      existing.folder_id,
      auth.user.id
    );
    if ("error" in accessCheck) return accessCheck.error;

    await deleteFolderMedia(auth.client, mediaId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
