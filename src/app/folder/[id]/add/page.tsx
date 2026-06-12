"use client";

import { useParams, useRouter } from "next/navigation";
import { getRouteParamId } from "@/lib/ids";
import Header from "@/components/Header";
import SongForm, { type SongFormValues } from "@/components/SongForm";
import { useAuth } from "@/components/AuthProvider";

export default function AddSongPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = getRouteParamId(params.id);
  const { session } = useAuth();

  async function handleSubmit(values: SongFormValues) {
    if (!folderId) {
      throw new Error("Invalid folder");
    }

    if (!session?.access_token) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}/add`)}`);
      throw new Error("Sign in required");
    }

    const res = await fetch("/api/songs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        folder_id: folderId,
        song_name: values.songName,
        song_url: values.songUrl,
        cover_image: values.coverImage,
        chord_url: values.chordUrl || null,
        drum_note_url: values.drumNoteUrl || null,
        bass_note_url: values.bassNoteUrl || null,
        notes: values.notes || null,
      }),
    });

    if (res.status === 401) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}/add`)}`);
      throw new Error("Sign in required");
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add song");
    }

    router.push(`/folder/${folderId}`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl pb-8">
      <Header title="Add Song" backHref={folderId ? `/folder/${folderId}` : "/"} />

      <div className="px-4 py-6 sm:px-6">
        <SongForm
          submitLabel="Add Song to Setlist"
          loadingLabel="Adding..."
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  );
}
