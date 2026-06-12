import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandMember, requireFolderOwner } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { getFolderById, deleteFolder, updateFolder } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const folder = await getFolderById(id, auth.client);

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    if (folder.band_id) {
      const memberCheck = await requireBandMember(
        auth.client,
        folder.band_id,
        auth.user.id
      );
      if ("error" in memberCheck) return memberCheck.error;
    } else if (folder.owner_id !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(folder);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch folder" },
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
    const ownerCheck = await requireFolderOwner(id, auth.user.id, auth.client);
    if ("error" in ownerCheck) return ownerCheck.error;

    const body = await request.json();
    const {
      name,
      rehearsal_date,
      practice_location_name,
      practice_location_url,
    } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: "Folder name cannot be empty" },
        { status: 400 }
      );
    }

    const updated = await updateFolder(
      id,
      {
        name: name?.trim(),
        rehearsal_date,
        practice_location_name,
        practice_location_url,
      },
      auth.client
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update folder" },
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
    const ownerCheck = await requireFolderOwner(id, auth.user.id, auth.client);
    if ("error" in ownerCheck) return ownerCheck.error;

    const folder = ownerCheck.folder;

    await deleteFolder(id, auth.client);

    if (folder.band_id) {
      await logBandActivity(auth.client, {
        bandId: folder.band_id,
        actorUserId: auth.user.id,
        action: BAND_ACTIVITY_ACTIONS.DELETE_FOLDER,
        metadata: {
          folder_id: folder.id,
          folder_name: folder.name,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
