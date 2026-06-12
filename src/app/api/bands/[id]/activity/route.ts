import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireBandMember } from "@/lib/auth-api";
import { listBandActivityLogs } from "@/lib/band-activity";

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

    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");

    const result = await listBandActivityLogs(auth.client, bandId, {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
    });

    return NextResponse.json({
      items: result.items,
      page: result.page,
      limit: result.limit,
      total: result.total,
      has_more: result.page * result.limit < result.total,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
