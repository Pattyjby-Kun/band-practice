import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FolderMedia,
  FolderMediaInput,
  FolderMediaType,
  FolderMediaUpdateInput,
} from "@/types/activity";

type FolderMediaRow = {
  id: string;
  folder_id: string;
  title: string;
  url: string;
  media_type: FolderMediaType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

const VALID_MEDIA_TYPES: FolderMediaType[] = [
  "google_drive",
  "youtube",
  "other",
];

export function isValidMediaType(value: string): value is FolderMediaType {
  return VALID_MEDIA_TYPES.includes(value as FolderMediaType);
}

function mapFolderMedia(row: FolderMediaRow): FolderMedia {
  return {
    id: row.id,
    folder_id: row.folder_id,
    title: row.title,
    url: row.url,
    media_type: row.media_type,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

async function attachCreatorDisplayNames(
  client: SupabaseClient,
  items: FolderMedia[]
): Promise<FolderMedia[]> {
  const creatorIds = [
    ...new Set(items.map((item) => item.created_by).filter(Boolean)),
  ] as string[];

  if (creatorIds.length === 0) return items;

  const { data: profiles } = await client
    .from("members")
    .select("user_id, display_name")
    .in("user_id", creatorIds);

  const nameByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.display_name])
  );

  return items.map((item) => ({
    ...item,
    created_by_display_name: item.created_by
      ? (nameByUserId.get(item.created_by) ?? null)
      : null,
  }));
}

export async function listFolderMedia(
  client: SupabaseClient,
  folderId: string
): Promise<FolderMedia[]> {
  const { data, error } = await client
    .from("folder_media")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const items = (data as FolderMediaRow[]).map(mapFolderMedia);
  return attachCreatorDisplayNames(client, items);
}

export async function getFolderMediaById(
  client: SupabaseClient,
  mediaId: string
): Promise<FolderMedia | null> {
  const { data, error } = await client
    .from("folder_media")
    .select("*")
    .eq("id", mediaId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [item] = await attachCreatorDisplayNames(client, [
    mapFolderMedia(data as FolderMediaRow),
  ]);
  return item;
}

export async function createFolderMedia(
  client: SupabaseClient,
  folderId: string,
  userId: string,
  input: FolderMediaInput
): Promise<FolderMedia> {
  const { data, error } = await client
    .from("folder_media")
    .insert({
      folder_id: folderId,
      title: input.title.trim(),
      url: input.url.trim(),
      media_type: input.media_type,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  const [item] = await attachCreatorDisplayNames(client, [
    mapFolderMedia(data as FolderMediaRow),
  ]);
  return item;
}

export async function updateFolderMedia(
  client: SupabaseClient,
  mediaId: string,
  input: FolderMediaUpdateInput
): Promise<FolderMedia> {
  const updates: Record<string, string | null> = {};

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.url !== undefined) updates.url = input.url.trim();
  if (input.media_type !== undefined) updates.media_type = input.media_type;
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null;

  const { data, error } = await client
    .from("folder_media")
    .update(updates)
    .eq("id", mediaId)
    .select("*")
    .single();

  if (error) throw error;

  const [item] = await attachCreatorDisplayNames(client, [
    mapFolderMedia(data as FolderMediaRow),
  ]);
  return item;
}

export async function deleteFolderMedia(
  client: SupabaseClient,
  mediaId: string
): Promise<void> {
  const { error } = await client.from("folder_media").delete().eq("id", mediaId);
  if (error) throw error;
}

export function mediaTypeLabel(mediaType: FolderMediaType): string {
  if (mediaType === "google_drive") return "Google Drive";
  if (mediaType === "youtube") return "YouTube";
  return "Other";
}
