import type { SupabaseClient } from "@supabase/supabase-js";
import type { Band, BandRole } from "@/types/band";

type BandRow = {
  id: string;
  name: string;
  owner_id: string | null;
  created_at: string;
};

type MembershipRow = {
  role: BandRole;
  band: BandRow | BandRow[] | null;
};

function unwrapBand(band: BandRow | BandRow[] | null): BandRow | null {
  if (!band) return null;
  return Array.isArray(band) ? (band[0] ?? null) : band;
}

export async function getBandById(
  client: SupabaseClient,
  bandId: string,
  userId: string
): Promise<Band | null> {
  const { data, error } = await client
    .from("band_members")
    .select(
      `
      role,
      band:bands (
        id,
        name,
        owner_id,
        created_at
      )
    `
    )
    .eq("band_id", bandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as MembershipRow;
  const band = unwrapBand(row.band);
  if (!band) return null;

  const { count } = await client
    .from("band_members")
    .select("*", { count: "exact", head: true })
    .eq("band_id", bandId);

  return {
    id: band.id,
    name: band.name,
    role: row.role,
    member_count: count ?? 1,
    owner_id: band.owner_id,
    created_at: band.created_at,
  };
}

export async function updateBandName(
  client: SupabaseClient,
  bandId: string,
  name: string
): Promise<BandRow> {
  const { data, error } = await client
    .from("bands")
    .update({ name: name.trim() })
    .eq("id", bandId)
    .select("id, name, owner_id, created_at")
    .single();

  if (error) throw error;
  return data as BandRow;
}

export async function deleteBandById(
  client: SupabaseClient,
  bandId: string
): Promise<void> {
  const { error } = await client.from("bands").delete().eq("id", bandId);
  if (error) throw error;
}

export async function getBandsForUser(
  client: SupabaseClient,
  userId: string
): Promise<Band[]> {
  const { data: memberships, error } = await client
    .from("band_members")
    .select(
      `
      role,
      band:bands (
        id,
        name,
        owner_id,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (memberships ?? []) as MembershipRow[];
  const bandIds = rows
    .map((row) => unwrapBand(row.band)?.id)
    .filter((id): id is string => Boolean(id));

  if (bandIds.length === 0) return [];

  const { data: memberRows, error: countError } = await client
    .from("band_members")
    .select("band_id")
    .in("band_id", bandIds);

  if (countError) throw countError;

  const memberCountByBand = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCountByBand.set(
      row.band_id,
      (memberCountByBand.get(row.band_id) ?? 0) + 1
    );
  }

  const bands: Band[] = [];

  for (const row of rows) {
    const band = unwrapBand(row.band);
    if (!band) continue;

    bands.push({
      id: band.id,
      name: band.name,
      role: row.role,
      member_count: memberCountByBand.get(band.id) ?? 1,
      owner_id: band.owner_id,
      created_at: band.created_at,
    });
  }

  return bands.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function createBandForUser(
  client: SupabaseClient,
  name: string
): Promise<Band> {
  const { data, error } = await client.rpc("create_band", {
    p_name: name.trim(),
  });

  if (error) throw error;

  const band = data as BandRow;

  return {
    id: band.id,
    name: band.name,
    role: "owner",
    member_count: 1,
    owner_id: band.owner_id,
    created_at: band.created_at,
  };
}
