import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAuthedSupabaseClient } from "@/lib/supabase/server";
import { getFolderById } from "@/lib/db";
import type { Folder } from "@/types";
import type { BandRole } from "@/types/band";

type AuthSuccess = {
  user: User;
  accessToken: string;
  client: SupabaseClient;
};

type AuthFailure = {
  error: NextResponse;
};

export async function requireAuth(
  request: NextRequest
): Promise<AuthSuccess | AuthFailure> {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!accessToken) {
    return {
      error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }

  const client = createAuthedSupabaseClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Sign in required" }, { status: 401 }),
    };
  }

  return { user, accessToken, client };
}

export async function requireFolderOwner(
  folderId: string,
  userId: string,
  client?: SupabaseClient
): Promise<{ folder: Folder } | AuthFailure> {
  const folder = await getFolderById(folderId, client);

  if (!folder) {
    return {
      error: NextResponse.json({ error: "Folder not found" }, { status: 404 }),
    };
  }

  if (!folder.owner_id || folder.owner_id !== userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { folder };
}

export async function requireBandMember(
  client: SupabaseClient,
  bandId: string,
  userId: string
): Promise<{ role: BandRole } | AuthFailure> {
  const { data, error } = await client
    .from("band_members")
    .select("role")
    .eq("band_id", bandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { role: data.role as BandRole };
}

export async function requireBandAdminOrOwner(
  client: SupabaseClient,
  bandId: string,
  userId: string
): Promise<{ role: BandRole } | AuthFailure> {
  const memberCheck = await requireBandMember(client, bandId, userId);
  if ("error" in memberCheck) return memberCheck;

  if (memberCheck.role !== "owner" && memberCheck.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return memberCheck;
}

export async function requireBandOwner(
  client: SupabaseClient,
  bandId: string,
  userId: string
): Promise<{ role: "owner" } | AuthFailure> {
  const memberCheck = await requireBandMember(client, bandId, userId);
  if ("error" in memberCheck) return memberCheck;

  if (memberCheck.role !== "owner") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { role: "owner" };
}

export async function requireFolderBandMember(
  client: SupabaseClient,
  folderId: string,
  userId: string
): Promise<{ folder: Folder } | AuthFailure> {
  const folder = await getFolderById(folderId, client);

  if (!folder) {
    return {
      error: NextResponse.json({ error: "Folder not found" }, { status: 404 }),
    };
  }

  if (folder.band_id) {
    const memberCheck = await requireBandMember(client, folder.band_id, userId);
    if ("error" in memberCheck) return memberCheck;
    return { folder };
  }

  if (folder.owner_id !== userId) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { folder };
}
