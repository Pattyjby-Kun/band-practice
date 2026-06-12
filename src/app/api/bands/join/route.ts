import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { joinBandByInviteCode, mapJoinError } from "@/lib/band-invites";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { invite_code } = body;

    if (!invite_code?.trim()) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    const band = await joinBandByInviteCode(auth.client, invite_code.trim());

    await logBandActivity(auth.client, {
      bandId: band.id,
      actorUserId: auth.user.id,
      targetUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.JOIN_BAND,
    });

    return NextResponse.json(band, { status: 200 });
  } catch (error) {
    const mapped = mapJoinError(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
