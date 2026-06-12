import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandMember } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { getFoldersByBandId, createFolder } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const bandId = request.nextUrl.searchParams.get("band_id");
    if (!bandId) {
      return NextResponse.json(
        { error: "band_id is required" },
        { status: 400 }
      );
    }

    const memberCheck = await requireBandMember(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in memberCheck) return memberCheck.error;

    const sortBy =
      request.nextUrl.searchParams.get("sort") === "name" ? "name" : "date";
    const folders = await getFoldersByBandId(bandId, sortBy, auth.client);
    return NextResponse.json(folders);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch folders" },
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
      band_id,
      name,
      rehearsal_date,
      practice_location_name,
      practice_location_url,
    } = body;

    if (!band_id?.trim()) {
      return NextResponse.json(
        { error: "band_id is required" },
        { status: 400 }
      );
    }

    const memberCheck = await requireBandMember(
      auth.client,
      String(band_id),
      auth.user.id
    );
    if ("error" in memberCheck) return memberCheck.error;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }
    if (!rehearsal_date?.trim()) {
      return NextResponse.json(
        { error: "Rehearsal date is required" },
        { status: 400 }
      );
    }

    const folder = await createFolder(
      {
        band_id: String(band_id),
        name: name.trim(),
        rehearsal_date: rehearsal_date,
        owner_id: auth.user.id,
        practice_location_name: practice_location_name ?? null,
        practice_location_url: practice_location_url ?? null,
      },
      auth.client
    );

    await logBandActivity(auth.client, {
      bandId: String(band_id),
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.CREATE_FOLDER,
      metadata: {
        folder_id: folder.id,
        folder_name: folder.name,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
