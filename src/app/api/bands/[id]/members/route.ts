import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandMember } from "@/lib/auth-api";
import { listBandMembers } from "@/lib/band-members";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    const { id: bandId } = await params;
    const memberCheck = await requireBandMember(
      auth.client,
      bandId,
      auth.user.id
    );
    if ("error" in memberCheck) return memberCheck.error;

    const members = await listBandMembers(auth.client, bandId);
    return NextResponse.json({ members });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}
