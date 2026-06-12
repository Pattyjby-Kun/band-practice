import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandAdminOrOwner } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { disableBandInvite } from "@/lib/band-invites";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId, inviteId } = await params;
    const adminCheck = await requireBandAdminOrOwner(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in adminCheck) return adminCheck.error;

    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action !== "disable") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: inviteRow, error: fetchError } = await auth.client
      .from("band_invites")
      .select("id, band_id, invite_code")
      .eq("id", inviteId)
      .maybeSingle();

    if (fetchError || !inviteRow || inviteRow.band_id !== bandId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const disabled = await disableBandInvite(auth.client, inviteId);

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.DISABLE_INVITE,
      metadata: { invite_code: inviteRow.invite_code },
    });

    return NextResponse.json(disabled);
  } catch {
    return NextResponse.json(
      { error: "Failed to disable invite" },
      { status: 500 }
    );
  }
}
