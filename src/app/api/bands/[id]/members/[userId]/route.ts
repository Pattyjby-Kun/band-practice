import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandMember } from "@/lib/auth-api";
import {
  BAND_ACTIVITY_ACTIONS,
  getMemberDisplayName,
  logBandActivity,
} from "@/lib/band-activity";
import {
  leaveBand,
  mapMemberActionError,
  removeBandMember,
  updateBandMemberRole,
} from "@/lib/band-members";
import type { BandRole } from "@/types/band";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId, userId } = await params;
    const memberCheck = await requireBandMember(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in memberCheck) return memberCheck.error;

    if (memberCheck.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body as { role?: BandRole };

    if (role !== "admin" && role !== "member") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const targetName = await getMemberDisplayName(auth.client, userId);

    await updateBandMemberRole(auth.client, bandId, userId, role);

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      targetUserId: userId,
      action:
        role === "admin"
          ? BAND_ACTIVITY_ACTIONS.PROMOTE_MEMBER
          : BAND_ACTIVITY_ACTIONS.DEMOTE_MEMBER,
      metadata: { target_name: targetName, role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const mapped = mapMemberActionError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId, userId } = await params;

    if (userId === auth.user.id) {
      await leaveBand(auth.client, bandId);

      await logBandActivity(auth.client, {
        bandId,
        actorUserId: auth.user.id,
        targetUserId: auth.user.id,
        action: BAND_ACTIVITY_ACTIONS.LEAVE_BAND,
      });

      return NextResponse.json({ success: true });
    }

    const memberCheck = await requireBandMember(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in memberCheck) return memberCheck.error;

    if (memberCheck.role !== "owner" && memberCheck.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetName = await getMemberDisplayName(auth.client, userId);

    await removeBandMember(auth.client, bandId, userId);

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      targetUserId: userId,
      action: BAND_ACTIVITY_ACTIONS.REMOVE_MEMBER,
      metadata: { target_name: targetName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const mapped = mapMemberActionError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
