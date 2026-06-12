export type BandRole = "owner" | "admin" | "member";

export interface Band {
  id: string;
  name: string;
  role: BandRole;
  member_count: number;
  owner_id?: string | null;
  created_at: string;
}

export interface BandMembership {
  id: string;
  band_id: string;
  user_id: string;
  role: BandRole;
  created_at: string;
}

export interface BandInvite {
  id: string;
  band_id: string;
  invite_code: string;
  created_by: string | null;
  expires_at: string | null;
  max_uses: number;
  current_uses: number;
  disabled_at: string | null;
  created_at: string;
}

export interface BandMemberProfile {
  id: string;
  user_id: string;
  display_name: string;
  role: BandRole;
  created_at: string;
}

export interface BandsResponse {
  bands: Band[];
}

export interface CreateBandInput {
  name: string;
}
