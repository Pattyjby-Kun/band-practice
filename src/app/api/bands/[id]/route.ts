import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  requireBandAdminOrOwner,
  requireBandMember,
  requireBandOwner,
} from "@/lib/auth-api";
import {
  deleteBandById,
  getBandById,
  updateBandName,
} from "@/lib/bands";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId } = await params;
    const band = await getBandById(auth.client, bandId, auth.user.id);

    if (!band) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    return NextResponse.json(band);
  } catch {
    return NextResponse.json({ error: "Failed to fetch band" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId } = await params;
    const adminCheck = await requireBandAdminOrOwner(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in adminCheck) return adminCheck.error;

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Band name is required" },
        { status: 400 }
      );
    }

    const existingBand = await getBandById(auth.client, bandId, auth.user.id);
    if (!existingBand) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    await updateBandName(auth.client, bandId, name.trim());

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.RENAME_BAND,
      metadata: {
        old_name: existingBand.name,
        new_name: name.trim(),
      },
    });

    const band = await getBandById(auth.client, bandId, auth.user.id);
    return NextResponse.json(band);
  } catch {
    return NextResponse.json({ error: "Failed to update band" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId } = await params;
    const ownerCheck = await requireBandOwner(auth.client, bandId, auth.user.id);
    if ("error" in ownerCheck) return ownerCheck.error;

    const body = await request.json().catch(() => ({}));
    const { confirm_name } = body as { confirm_name?: string };

    const band = await getBandById(auth.client, bandId, auth.user.id);
    if (!band) {
      return NextResponse.json({ error: "Band not found" }, { status: 404 });
    }

    if (!confirm_name?.trim() || confirm_name.trim() !== band.name) {
      return NextResponse.json(
        { error: "Band name confirmation does not match" },
        { status: 400 }
      );
    }

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.DELETE_BAND,
      metadata: { band_name: band.name },
    });

    await deleteBandById(auth.client, bandId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete band" }, { status: 500 });
  }
}
