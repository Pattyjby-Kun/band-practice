export const BAND_ACTIVITY_ACTIONS = {
  CREATE_BAND: "create_band",
  RENAME_BAND: "rename_band",
  DELETE_BAND: "delete_band",
  JOIN_BAND: "join_band",
  LEAVE_BAND: "leave_band",
  CREATE_INVITE: "create_invite",
  DISABLE_INVITE: "disable_invite",
  CREATE_FOLDER: "create_folder",
  DELETE_FOLDER: "delete_folder",
  ADD_SONG: "add_song",
  EDIT_SONG: "edit_song",
  DELETE_SONG: "delete_song",
  PROMOTE_MEMBER: "promote_member",
  DEMOTE_MEMBER: "demote_member",
  REMOVE_MEMBER: "remove_member",
} as const;

export type BandActivityAction =
  (typeof BAND_ACTIVITY_ACTIONS)[keyof typeof BAND_ACTIVITY_ACTIONS];

export interface BandActivityLog {
  id: string;
  band_id: string;
  actor_user_id: string;
  target_user_id: string | null;
  action: BandActivityAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BandActivityEntry extends BandActivityLog {
  actor_display_name: string;
  target_display_name: string | null;
  description: string;
}

export interface BandActivityResponse {
  items: BandActivityEntry[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

export type FolderMediaType = "google_drive" | "youtube" | "other";

export interface FolderMedia {
  id: string;
  folder_id: string;
  title: string;
  url: string;
  media_type: FolderMediaType;
  notes: string | null;
  created_by: string | null;
  created_by_display_name?: string | null;
  created_at: string;
}

export interface FolderMediaInput {
  title: string;
  url: string;
  media_type: FolderMediaType;
  notes?: string | null;
}

export interface FolderMediaUpdateInput {
  title?: string;
  url?: string;
  media_type?: FolderMediaType;
  notes?: string | null;
}
