import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireFolderBandMember } from "@/lib/auth-api";
import {
  createFolderMedia,
  isValidMediaType,
  listFolderMedia,
} from "@/lib/folder-media";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: folderId } = await params;
    const accessCheck = await requireFolderBandMember(
      auth.client,
      folderId,
      auth.user.id
    );
    if ("error" in accessCheck) return accessCheck.error;

    const media = await listFolderMedia(auth.client, folderId);
    return NextResponse.json({ media });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: folderId } = await params;
    const accessCheck = await requireFolderBandMember(
      auth.client,
      folderId,
      auth.user.id
    );
    if ("error" in accessCheck) return accessCheck.error;

    const body = await request.json();
    const { title, url, media_type, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!url?.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    if (!media_type || !isValidMediaType(String(media_type))) {
      return NextResponse.json(
        { error: "media_type must be google_drive, youtube, or other" },
        { status: 400 }
      );
    }

    const media = await createFolderMedia(
      auth.client,
      folderId,
      auth.user.id,
      {
        title: String(title),
        url: String(url),
        media_type: media_type,
        notes: notes ?? null,
      }
    );

    return NextResponse.json(media, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create media" },
      { status: 500 }
    );
  }
}
