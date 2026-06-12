import type { SupabaseClient } from "@supabase/supabase-js";
import type { BandMemberProfile, BandRole } from "@/types/band";

export async function listBandMembers(
  client: SupabaseClient,
  bandId: string
): Promise<BandMemberProfile[]> {
  const { data: memberRows, error } = await client
    .from("band_members")
    .select("id, user_id, role, created_at")
    .eq("band_id", bandId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const userIds = (memberRows ?? []).map((row) => row.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await client
    .from("members")
    .select("user_id, display_name")
    .in("user_id", userIds);

  if (profileError) throw profileError;

  const nameByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.display_name])
  );

  return (memberRows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    display_name: nameByUserId.get(row.user_id) ?? "Unknown",
    role: row.role as BandRole,
    created_at: row.created_at,
  }));
}

export async function leaveBand(
  client: SupabaseClient,
  bandId: string
): Promise<void> {
  const { error } = await client.rpc("leave_band", { p_band_id: bandId });
  if (error) throw error;
}

export async function removeBandMember(
  client: SupabaseClient,
  bandId: string,
  userId: string
): Promise<void> {
  const { error } = await client.rpc("remove_band_member", {
    p_band_id: bandId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function updateBandMemberRole(
  client: SupabaseClient,
  bandId: string,
  userId: string,
  role: BandRole
): Promise<void> {
  const { error } = await client.rpc("update_band_member_role", {
    p_band_id: bandId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

export function mapMemberActionError(error: unknown): {
  message: string;
  status: number;
} {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : "Request failed";

  if (message.includes("Forbidden")) {
    return { message: "Forbidden", status: 403 };
  }
  if (message.includes("Owner cannot leave")) {
    return { message: "Owner cannot leave band", status: 403 };
  }
  if (message.includes("Cannot remove owner")) {
    return { message: "Cannot remove owner", status: 403 };
  }
  if (message.includes("Member not found")) {
    return { message: "Member not found", status: 404 };
  }
  if (message.includes("Invalid role")) {
    return { message: "Invalid role", status: 400 };
  }

  return { message: "Request failed", status: 500 };
}
