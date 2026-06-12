export interface Folder {
  id: string;
  name: string;
  band_id: string | null;
  rehearsal_date: string;
  practice_location_name: string | null;
  practice_location_url: string | null;
  owner_id: string | null;
  owner_display_name?: string | null;
  created_at: string;
  song_count?: number;
}

export interface Song {
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
  likes?: number;
  dislikes?: number;
  vote_score?: number;
}

export interface Member {
  id: string;
  user_id?: string | null;
  display_name: string;
  instrument: string | null;
  created_at: string;
}

export interface Vote {
  id: string;
  song_id: string;
  member_id: string | null;
  vote_type: "like" | "dislike";
  created_at: string;
}

export interface SongMetadata {
  title: string;
  thumbnail: string;
  source: "youtube" | "spotify" | "unknown";
}

export interface FolderInput {
  band_id: string;
  name: string;
  rehearsal_date: string;
  practice_location_name?: string | null;
  practice_location_url?: string | null;
}

export interface FolderUpdateInput {
  name?: string;
  rehearsal_date?: string;
  practice_location_name?: string | null;
  practice_location_url?: string | null;
}

export interface SongUpdateInput {
  song_name?: string;
  song_url?: string;
  cover_image?: string | null;
  chord_url?: string | null;
  drum_note_url?: string | null;
  bass_note_url?: string | null;
  notes?: string | null;
}
