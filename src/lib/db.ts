import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { logVoteDebug } from "@/lib/errors";
import type { Folder, Member, Song } from "@/types";

type FolderRow = {
  id: string;
  name: string;
  band_id: string | null;
  rehearsal_date: string;
  practice_location_name: string | null;
  practice_location_url: string | null;
  owner_id: string | null;
  created_at: string;
  songs?: { count: number }[];
};

type SongRow = {
  id: string;
  folder_id: string;
  song_name: string;
  song_url: string;
  cover_image: string | null;
  chord_url: string | null;
  drum_note_url: string | null;
  bass_note_url: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  votes?: { vote_type: "like" | "dislike" }[];
};

function mapFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    band_id: row.band_id,
    rehearsal_date: row.rehearsal_date,
    practice_location_name: row.practice_location_name,
    practice_location_url: row.practice_location_url,
    owner_id: row.owner_id,
    created_at: row.created_at,
    song_count: row.songs?.[0]?.count ?? 0,
  };
}

async function attachOwnerDisplayNames(folders: Folder[]): Promise<Folder[]> {
  const ownerIds = [
    ...new Set(folders.map((folder) => folder.owner_id).filter(Boolean)),
  ] as string[];

  if (ownerIds.length === 0) return folders;

  const { data, error } = await supabase
    .from("members")
    .select("user_id, display_name")
    .in("user_id", ownerIds);

  if (error) throw error;

  const nameByUserId = new Map(
    (data ?? []).map((member) => [member.user_id, member.display_name])
  );

  return folders.map((folder) => ({
    ...folder,
    owner_display_name: folder.owner_id
      ? (nameByUserId.get(folder.owner_id) ?? null)
      : null,
  }));
}

function mapSong(row: SongRow): Song {
  const likes =
    row.votes?.filter((vote) => vote.vote_type === "like").length ?? 0;
  const dislikes =
    row.votes?.filter((vote) => vote.vote_type === "dislike").length ?? 0;

  return {
    id: row.id,
    folder_id: row.folder_id,
    song_name: row.song_name,
    song_url: row.song_url,
    cover_image: row.cover_image,
    chord_url: row.chord_url,
    drum_note_url: row.drum_note_url,
    bass_note_url: row.bass_note_url,
    notes: row.notes,
    sort_order: row.sort_order,
    created_at: row.created_at,
    likes,
    dislikes,
    vote_score: likes - dislikes,
  };
}

export async function getFoldersByBandId(
  bandId: string,
  sortBy: "date" | "name" = "date",
  client: SupabaseClient = supabase
): Promise<Folder[]> {
  const query = client
    .from("folders")
    .select("*, songs(count)")
    .eq("band_id", bandId);

  const { data, error } = await (sortBy === "date"
    ? query.order("rehearsal_date", { ascending: true })
    : query.order("name", { ascending: true }));

  if (error) throw error;
  return attachOwnerDisplayNames((data as FolderRow[]).map(mapFolder));
}

export async function getAllFolders(
  sortBy: "date" | "name" = "date"
): Promise<Folder[]> {
  const query = supabase.from("folders").select("*, songs(count)");

  const { data, error } = await (sortBy === "date"
    ? query.order("rehearsal_date", { ascending: true })
    : query.order("name", { ascending: true }));

  if (error) throw error;
  return attachOwnerDisplayNames((data as FolderRow[]).map(mapFolder));
}

export async function getFolderById(
  id: string,
  client: SupabaseClient = supabase
): Promise<Folder | undefined> {
  const { data, error } = await client
    .from("folders")
    .select("*, songs(count)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  const [folder] = await attachOwnerDisplayNames([mapFolder(data as FolderRow)]);
  return folder;
}

export async function createFolder(
  data: {
    band_id: string;
    name: string;
    rehearsal_date: string;
    owner_id: string;
    practice_location_name?: string | null;
    practice_location_url?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<Folder> {
  const { data: inserted, error } = await client
    .from("folders")
    .insert({
      band_id: data.band_id,
      name: data.name,
      rehearsal_date: data.rehearsal_date,
      owner_id: data.owner_id,
      practice_location_name: data.practice_location_name?.trim() || null,
      practice_location_url: data.practice_location_url?.trim() || null,
    })
    .select("*, songs(count)")
    .single();

  if (error) throw error;
  const [folder] = await attachOwnerDisplayNames([mapFolder(inserted as FolderRow)]);
  return folder;
}

export async function updateFolder(
  id: string,
  data: {
    name?: string;
    rehearsal_date?: string;
    practice_location_name?: string | null;
    practice_location_url?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<Folder> {
  const updates: Record<string, string | null> = {};

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.rehearsal_date !== undefined) {
    updates.rehearsal_date = data.rehearsal_date;
  }
  if (data.practice_location_name !== undefined) {
    updates.practice_location_name = data.practice_location_name?.trim() || null;
  }
  if (data.practice_location_url !== undefined) {
    updates.practice_location_url = data.practice_location_url?.trim() || null;
  }

  const { data: updated, error } = await client
    .from("folders")
    .update(updates)
    .eq("id", id)
    .select("*, songs(count)")
    .single();

  if (error) throw error;
  const [folder] = await attachOwnerDisplayNames([mapFolder(updated as FolderRow)]);
  return folder;
}

export async function deleteFolder(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from("folders").delete().eq("id", id);
  if (error) throw error;
}

export async function getSongsByFolderId(
  folderId: string,
  sortBy: "votes" | "order" = "order"
): Promise<Song[]> {
  const query = supabase
    .from("songs")
    .select("*, votes(vote_type)")
    .eq("folder_id", folderId);

  const { data, error } = await (sortBy === "order"
    ? query
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : query.order("created_at", { ascending: true }));

  if (error) throw error;

  let songs = (data as SongRow[]).map(mapSong);

  if (sortBy === "votes") {
    songs = songs.sort((a, b) => {
      const scoreDiff = (b.vote_score ?? 0) - (a.vote_score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.sort_order - b.sort_order;
    });
  }

  return songs;
}

export async function getSongById(id: string): Promise<Song | undefined> {
  const { data, error } = await supabase
    .from("songs")
    .select("*, votes(vote_type)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapSong(data as SongRow);
}

export async function createSong(
  data: {
    folder_id: string;
    song_name: string;
    song_url: string;
    cover_image?: string | null;
    chord_url?: string | null;
    drum_note_url?: string | null;
    bass_note_url?: string | null;
    notes?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<Song> {
  const { data: maxRow, error: maxError } = await client
    .from("songs")
    .select("sort_order")
    .eq("folder_id", data.folder_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) throw maxError;

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data: inserted, error } = await client
    .from("songs")
    .insert({
      folder_id: data.folder_id,
      song_name: data.song_name,
      song_url: data.song_url,
      cover_image: data.cover_image ?? null,
      google_map_url: "",
      chord_url: data.chord_url ?? null,
      drum_note_url: data.drum_note_url ?? null,
      bass_note_url: data.bass_note_url ?? null,
      notes: data.notes ?? null,
      sort_order: nextOrder,
    })
    .select("*, votes(vote_type)")
    .single();

  if (error) throw error;
  return mapSong(inserted as SongRow);
}

export async function updateSong(
  id: string,
  data: {
    song_name?: string;
    song_url?: string;
    cover_image?: string | null;
    chord_url?: string | null;
    drum_note_url?: string | null;
    bass_note_url?: string | null;
    notes?: string | null;
  },
  client: SupabaseClient = supabase
): Promise<Song> {
  const updates: Record<string, string | null> = {};

  if (data.song_name !== undefined) updates.song_name = data.song_name.trim();
  if (data.song_url !== undefined) updates.song_url = data.song_url.trim();
  if (data.cover_image !== undefined) updates.cover_image = data.cover_image;
  if (data.chord_url !== undefined) {
    updates.chord_url = data.chord_url?.trim() || null;
  }
  if (data.drum_note_url !== undefined) {
    updates.drum_note_url = data.drum_note_url?.trim() || null;
  }
  if (data.bass_note_url !== undefined) {
    updates.bass_note_url = data.bass_note_url?.trim() || null;
  }
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null;

  const { data: updated, error } = await client
    .from("songs")
    .update(updates)
    .eq("id", id)
    .select("*, votes(vote_type)")
    .single();

  if (error) throw error;
  return mapSong(updated as SongRow);
}

export async function deleteSong(
  id: string,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client.from("songs").delete().eq("id", id);
  if (error) throw error;
}

export async function getOrCreateMemberForUser(
  client: SupabaseClient,
  user: User
): Promise<Member> {
  const { data: existing, error: existingError } = await client
    .from("members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as Member;

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email;

  const { data: created, error: createError } = await client
    .from("members")
    .insert({
      user_id: user.id,
      display_name: displayName,
      instrument: null,
    })
    .select("*")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const { data: retry, error: retryError } = await client
        .from("members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (retryError) throw retryError;
      if (retry) return retry as Member;
    }
    throw createError;
  }
  return created as Member;
}

export async function toggleVote(
  client: SupabaseClient,
  songId: string,
  voteType: "like" | "dislike",
  accessToken: string
): Promise<Song> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(accessToken);

  logVoteDebug("auth.getUser", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    authError: userError
      ? {
          message: userError.message,
          code: userError.code,
          status: userError.status,
        }
      : null,
  });

  if (userError) throw userError;
  if (!user) throw new Error("Unauthorized");

  const member = await getOrCreateMemberForUser(client, user);

  logVoteDebug("member.lookup", {
    memberId: member.id,
    userId: member.user_id ?? user.id,
    memberName: member.display_name,
  });

  const { data: existing, error: existingVoteError } = await client
    .from("votes")
    .select("id, vote_type")
    .eq("song_id", songId)
    .eq("member_id", member.id)
    .maybeSingle();

  logVoteDebug("vote.lookup", {
    songId,
    memberId: member.id,
    existingVote: existing ?? null,
    lookupError: existingVoteError
      ? {
          message: existingVoteError.message,
          code: existingVoteError.code,
          details: existingVoteError.details,
          hint: existingVoteError.hint,
        }
      : null,
  });

  if (existingVoteError) throw existingVoteError;

  let operation: "insert" | "delete" | "update";

  if (!existing) {
    operation = "insert";
    const { error } = await client.from("votes").insert({
      song_id: songId,
      member_id: member.id,
      vote_type: voteType,
    });
    logVoteDebug("vote.insert", {
      songId,
      memberId: member.id,
      voteType,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
    if (error) throw error;
  } else if (existing.vote_type === voteType) {
    operation = "delete";
    const { error } = await client
      .from("votes")
      .delete()
      .eq("id", existing.id);
    logVoteDebug("vote.delete", {
      voteId: existing.id,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
    if (error) throw error;
  } else {
    operation = "update";
    const { error } = await client
      .from("votes")
      .update({ vote_type: voteType })
      .eq("id", existing.id);
    logVoteDebug("vote.update", {
      voteId: existing.id,
      from: existing.vote_type,
      to: voteType,
      error: error
        ? {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : null,
    });
    if (error) throw error;
  }

  logVoteDebug("vote.result", { operation, songId, memberId: member.id, voteType });

  const song = await getSongById(songId);
  if (!song) throw new Error("Song not found after vote");
  return song;
}

export async function reorderSongs(
  folderId: string,
  songIds: string[],
  client: SupabaseClient = supabase
): Promise<void> {
  const updates = songIds.map((id, index) =>
    client
      .from("songs")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("folder_id", folderId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function getAllMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return data as Member[];
}

export async function createMember(
  displayName: string,
  instrument?: string | null
): Promise<Member> {
  const { data, error } = await supabase
    .from("members")
    .insert({ display_name: displayName, instrument: instrument ?? null })
    .select("*")
    .single();

  if (error) throw error;
  return data as Member;
}
