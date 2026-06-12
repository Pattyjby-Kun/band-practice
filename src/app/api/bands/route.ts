import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-api";
import { BAND_ACTIVITY_ACTIONS, logBandActivity } from "@/lib/band-activity";
import { createBandForUser, getBandsForUser } from "@/lib/bands";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const bands = await getBandsForUser(auth.client, auth.user.id);
    return NextResponse.json({ bands });
  } catch {
    return NextResponse.json({ error: "Failed to fetch bands" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Band name is required" },
        { status: 400 }
      );
    }

    const band = await createBandForUser(auth.client, name.trim());

    await logBandActivity(auth.client, {
      bandId: band.id,
      actorUserId: auth.user.id,
      action: BAND_ACTIVITY_ACTIONS.CREATE_BAND,
      metadata: { band_name: band.name },
    });

    return NextResponse.json(band, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create band";

    if (message.includes("Band name is required")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create band" }, { status: 500 });
  }
}
