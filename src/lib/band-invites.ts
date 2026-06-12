import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Band, BandInvite } from "@/types/band";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";

  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }

  return code;
}

type BandInviteRow = {
  id: string;
  band_id: string;
  invite_code: string;
  created_by: string | null;
  expires_at: string | null;
  max_uses: number;
  current_uses: number;
  disabled_at: string | null;
  created_at: string;
};

function mapInvite(row: BandInviteRow): BandInvite {
  return {
    id: row.id,
    band_id: row.band_id,
    invite_code: row.invite_code,
    created_by: row.created_by,
    expires_at: row.expires_at,
    max_uses: row.max_uses,
    current_uses: row.current_uses,
    disabled_at: row.disabled_at,
    created_at: row.created_at,
  };
}

export async function listBandInvites(
  client: SupabaseClient,
  bandId: string,
  options?: { activeOnly?: boolean }
): Promise<BandInvite[]> {
  let query = client
    .from("band_invites")
    .select("*")
    .eq("band_id", bandId);

  if (options?.activeOnly) {
    query = query.is("disabled_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data as BandInviteRow[]).map(mapInvite);
}

export async function disableBandInvite(
  client: SupabaseClient,
  inviteId: string
): Promise<BandInvite> {
  const { data, error } = await client
    .from("band_invites")
    .update({ disabled_at: new Date().toISOString() })
    .eq("id", inviteId)
    .select("*")
    .single();

  if (error) throw error;
  return mapInvite(data as BandInviteRow);
}

export async function createBandInvite(
  client: SupabaseClient,
  bandId: string,
  userId: string,
  options?: {
    expires_at?: string | null;
    max_uses?: number;
  }
): Promise<BandInvite> {
  const maxUses = options?.max_uses ?? 0;

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await client
      .from("band_invites")
      .insert({
        band_id: bandId,
        invite_code: inviteCode,
        created_by: userId,
        expires_at: options?.expires_at ?? null,
        max_uses: maxUses,
      })
      .select("*")
      .single();

    if (!error && data) {
      return mapInvite(data as BandInviteRow);
    }

    if (error?.code !== "23505") {
      throw error;
    }
  }

  throw new Error("Failed to generate unique invite code");
}

export async function joinBandByInviteCode(
  client: SupabaseClient,
  inviteCode: string
): Promise<Band> {
  const { data, error } = await client.rpc("join_band_by_invite", {
    p_invite_code: inviteCode.trim(),
  });

  if (error) {
    throw error;
  }

  const band = data as {
    id: string;
    name: string;
    owner_id: string | null;
    created_at: string;
  };

  return {
    id: band.id,
    name: band.name,
    role: "member",
    member_count: 0,
    owner_id: band.owner_id,
    created_at: band.created_at,
  };
}

export function mapJoinError(error: unknown): { message: string; status: number } {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : "Failed to join band";

  if (message.includes("Not authenticated")) {
    return { message: "Sign in required", status: 401 };
  }
  if (message.includes("Invalid invite code")) {
    return { message: "Invalid invite code", status: 404 };
  }
  if (message.includes("Invite expired")) {
    return { message: "Invite expired", status: 410 };
  }
  if (message.includes("maximum uses")) {
    return { message: "Invite has reached maximum uses", status: 410 };
  }
  if (message.includes("Already a member")) {
    return { message: "You are already a member of this band", status: 409 };
  }
  if (message.includes("Invite code is required")) {
    return { message: "Invite code is required", status: 400 };
  }
  if (message.includes("Invite disabled")) {
    return { message: "Invite disabled", status: 410 };
  }

  return { message: "Failed to join band", status: 500 };
}
