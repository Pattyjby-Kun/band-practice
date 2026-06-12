import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BandActivityAction,
  BandActivityEntry,
  BandActivityLog,
} from "@/types/activity";

export { BAND_ACTIVITY_ACTIONS } from "@/types/activity";
export type { BandActivityAction, BandActivityEntry, BandActivityLog };

type ActivityRow = {
  id: string;
  band_id: string;
  actor_user_id: string;
  target_user_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export interface LogBandActivityInput {
  bandId: string;
  actorUserId: string;
  action: BandActivityAction;
  targetUserId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logBandActivity(
  client: SupabaseClient,
  input: LogBandActivityInput
): Promise<void> {
  const { error } = await client.from("band_activity_logs").insert({
    band_id: input.bandId,
    actor_user_id: input.actorUserId,
    target_user_id: input.targetUserId ?? null,
    action: input.action,
    metadata: input.metadata ?? {},
  });

  if (error && process.env.NODE_ENV === "development") {
    console.error("[activity] failed to log:", error.message);
  }
}

export async function listBandActivityLogs(
  client: SupabaseClient,
  bandId: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ items: BandActivityEntry[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { count, error: countError } = await client
    .from("band_activity_logs")
    .select("*", { count: "exact", head: true })
    .eq("band_id", bandId);

  if (countError) throw countError;

  const { data, error } = await client
    .from("band_activity_logs")
    .select("*")
    .eq("band_id", bandId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const rows = (data ?? []) as ActivityRow[];
  const userIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.actor_user_id, row.target_user_id])
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let nameByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from("members")
      .select("user_id, display_name")
      .in("user_id", userIds);

    nameByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.user_id, profile.display_name])
    );
  }

  const items = rows.map((row) => {
    const log: BandActivityLog = {
      id: row.id,
      band_id: row.band_id,
      actor_user_id: row.actor_user_id,
      target_user_id: row.target_user_id,
      action: row.action as BandActivityAction,
      metadata: row.metadata ?? {},
      created_at: row.created_at,
    };

    const actorDisplayName =
      nameByUserId.get(row.actor_user_id) ??
      (log.metadata.actor_name as string | undefined) ??
      "Someone";

    const targetDisplayName = row.target_user_id
      ? (nameByUserId.get(row.target_user_id) ??
        (log.metadata.target_name as string | undefined) ??
        null)
      : null;

    return {
      ...log,
      actor_display_name: actorDisplayName,
      target_display_name: targetDisplayName,
      description: describeBandActivity(log, actorDisplayName, targetDisplayName),
    };
  });

  return {
    items,
    total: count ?? 0,
    page,
    limit,
  };
}

export function describeBandActivity(
  entry: BandActivityLog,
  actorName: string,
  targetName: string | null
): string {
  const meta = entry.metadata;
  const quoted = (value: unknown) =>
    typeof value === "string" && value.trim() ? `"${value.trim()}"` : null;

  switch (entry.action) {
    case "create_band":
      return `${actorName} created the band ${quoted(meta.band_name) ?? ""}`.trim();
    case "rename_band":
      return `${actorName} renamed the band to ${quoted(meta.new_name) ?? "a new name"}`;
    case "delete_band":
      return `${actorName} deleted the band ${quoted(meta.band_name) ?? ""}`.trim();
    case "join_band":
      return `${actorName} joined the band`;
    case "leave_band":
      return `${actorName} left the band`;
    case "create_invite":
      return `${actorName} created invite code ${quoted(meta.invite_code) ?? ""}`.trim();
    case "disable_invite":
      return `${actorName} disabled invite code ${quoted(meta.invite_code) ?? ""}`.trim();
    case "create_folder":
      return `${actorName} created folder ${quoted(meta.folder_name) ?? "a folder"}`;
    case "delete_folder":
      return `${actorName} deleted folder ${quoted(meta.folder_name) ?? "a folder"}`;
    case "add_song":
      return `${actorName} added song ${quoted(meta.song_name) ?? "a song"}`;
    case "edit_song":
      return `${actorName} edited song ${quoted(meta.song_name) ?? "a song"}`;
    case "delete_song":
      return `${actorName} deleted song ${quoted(meta.song_name) ?? "a song"}`;
    case "promote_member":
      return `${actorName} promoted ${targetName ?? (meta.target_name as string) ?? "a member"} to Admin`;
    case "demote_member":
      return `${actorName} demoted ${targetName ?? (meta.target_name as string) ?? "a member"} to Member`;
    case "remove_member":
      return `${actorName} removed ${targetName ?? (meta.target_name as string) ?? "a member"} from the band`;
    default:
      return `${actorName} performed ${String(entry.action).replace(/_/g, " ")}`;
  }
}

export async function getMemberDisplayName(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await client
    .from("members")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.display_name ?? null;
}
