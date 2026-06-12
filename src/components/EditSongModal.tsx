"use client";

import { X } from "lucide-react";
import type { Song } from "@/types";
import SongForm, { type SongFormValues } from "@/components/SongForm";

interface EditSongModalProps {
  isOpen: boolean;
  song: Song | null;
  accessToken: string;
  onClose: () => void;
  onSaved: (song: Song) => void;
}

export default function EditSongModal({
  isOpen,
  song,
  accessToken,
  onClose,
  onSaved,
}: EditSongModalProps) {
  if (!isOpen || !song) return null;

  const songId = song.id;

  async function handleSubmit(values: SongFormValues) {
    const res = await fetch(`/api/songs/${songId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        song_name: values.songName,
        song_url: values.songUrl,
        cover_image: values.coverImage,
        chord_url: values.chordUrl || null,
        drum_note_url: values.drumNoteUrl || null,
        bass_note_url: values.bassNoteUrl || null,
        notes: values.notes || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update song");
    }

    const updated: Song = await res.json();
    onSaved(updated);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="glass-card relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Edit Song</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SongForm
          initialValues={{
            songName: song.song_name,
            songUrl: song.song_url,
            coverImage: song.cover_image,
            chordUrl: song.chord_url ?? "",
            drumNoteUrl: song.drum_note_url ?? "",
            bassNoteUrl: song.bass_note_url ?? "",
            notes: song.notes ?? "",
          }}
          submitLabel="Save Changes"
          loadingLabel="Saving..."
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
