import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandAdminOrOwner } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { createBandInvite, listBandInvites } from "@/lib/band-invites";

export async function GET(
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

    const invites = await listBandInvites(auth.client, bandId, {
      activeOnly: true,
    });
    return NextResponse.json({ invites });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch invites" },
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

    const { id: bandId } = await params;
    const adminCheck = await requireBandAdminOrOwner(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in adminCheck) return adminCheck.error;

    const body = await request.json().catch(() => ({}));
    const { expires_at, max_uses } = body as {
      expires_at?: string | null;
      max_uses?: number;
    };

    if (max_uses !== undefined && (typeof max_uses !== "number" || max_uses < 0)) {
      return NextResponse.json(
        { error: "max_uses must be a non-negative number" },
        { status: 400 }
      );
    }

    const invite = await createBandInvite(auth.client, bandId, auth.user.id, {
      expires_at: expires_at ?? null,
      max_uses: max_uses ?? 0,
    });

    await logBandActivity(auth.client, {
      bandId,
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.CREATE_INVITE,
      metadata: { invite_code: invite.invite_code },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
