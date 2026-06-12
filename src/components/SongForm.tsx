"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, Music2 } from "lucide-react";
import type { SongMetadata } from "@/types";

export interface SongFormValues {
  songName: string;
  songUrl: string;
  coverImage: string | null;
  chordUrl: string;
  drumNoteUrl: string;
  bassNoteUrl: string;
  notes: string;
}

interface SongFormProps {
  initialValues?: Partial<SongFormValues>;
  submitLabel: string;
  loadingLabel: string;
  onSubmit: (values: SongFormValues) => Promise<void>;
}

const emptyValues: SongFormValues = {
  songName: "",
  songUrl: "",
  coverImage: null,
  chordUrl: "",
  drumNoteUrl: "",
  bassNoteUrl: "",
  notes: "",
};

export default function SongForm({
  initialValues,
  submitLabel,
  loadingLabel,
  onSubmit,
}: SongFormProps) {
  const [songName, setSongName] = useState(initialValues?.songName ?? "");
  const [songUrl, setSongUrl] = useState(initialValues?.songUrl ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(
    initialValues?.coverImage ?? null
  );
  const [chordUrl, setChordUrl] = useState(initialValues?.chordUrl ?? "");
  const [drumNoteUrl, setDrumNoteUrl] = useState(initialValues?.drumNoteUrl ?? "");
  const [bassNoteUrl, setBassNoteUrl] = useState(initialValues?.bassNoteUrl ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata | null>(null);

  useEffect(() => {
    if (initialValues) {
      setSongName(initialValues.songName ?? "");
      setSongUrl(initialValues.songUrl ?? "");
      setCoverImage(initialValues.coverImage ?? null);
      setChordUrl(initialValues.chordUrl ?? "");
      setDrumNoteUrl(initialValues.drumNoteUrl ?? "");
      setBassNoteUrl(initialValues.bassNoteUrl ?? "");
      setNotes(initialValues.notes ?? "");
      setError("");
    }
  }, [initialValues]);

  const fetchMetadata = useCallback(async (url: string) => {
    if (!url.trim()) {
      setMetadata(null);
      return;
    }

    setFetchingMeta(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data: SongMetadata = await res.json();
        setMetadata(data);
        if (data.title) {
          setSongName(data.title);
        }
        if (data.thumbnail) {
          setCoverImage(data.thumbnail);
        }
      } else {
        setMetadata(null);
      }
    } catch {
      setMetadata(null);
    } finally {
      setFetchingMeta(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (songUrl.trim() && songUrl !== initialValues?.songUrl) {
        fetchMetadata(songUrl);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [songUrl, fetchMetadata, initialValues?.songUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!songName.trim()) {
      setError("Song name is required");
      return;
    }
    if (!songUrl.trim()) {
      setError("Song URL is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        songName: songName.trim(),
        songUrl: songUrl.trim(),
        coverImage,
        chordUrl: chordUrl.trim(),
        drumNoteUrl: drumNoteUrl.trim(),
        bassNoteUrl: bassNoteUrl.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save song");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="song-url" className="mb-1.5 block text-sm font-medium text-foreground/80">
          Song URL (YouTube or Spotify) <span className="text-accent">*</span>
        </label>
        <div className="relative">
          <input
            id="song-url"
            type="url"
            value={songUrl}
            onChange={(e) => setSongUrl(e.target.value)}
            placeholder="https://youtube.com/... or https://open.spotify.com/..."
            className="input-field pr-10"
            required
          />
          {fetchingMeta && (
            <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary-light" />
          )}
        </div>
        {metadata && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/50 p-3 animate-fade-in">
            {coverImage ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={coverImage}
                  alt={metadata.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Music2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Auto-fetched from {metadata.source}</p>
              <p className="font-medium text-foreground">{metadata.title}</p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="song-name" className="mb-1.5 block text-sm font-medium text-foreground/80">
          Song Name <span className="text-accent">*</span>
        </label>
        <input
          id="song-name"
          type="text"
          value={songName}
          onChange={(e) => setSongName(e.target.value)}
          placeholder="Song title"
          className="input-field"
          required
        />
      </div>

      <fieldset className="space-y-4 rounded-xl border border-border p-4">
        <legend className="px-2 text-sm font-medium text-muted-foreground">Optional Resources</legend>

        <div>
          <label htmlFor="chord-url" className="mb-1.5 block text-sm text-muted-foreground">
            Chord Sheet URL
          </label>
          <input
            id="chord-url"
            type="url"
            value={chordUrl}
            onChange={(e) => setChordUrl(e.target.value)}
            placeholder="Link to chord sheet"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="drum-url" className="mb-1.5 block text-sm text-muted-foreground">
            Drum Note URL
          </label>
          <input
            id="drum-url"
            type="url"
            value={drumNoteUrl}
            onChange={(e) => setDrumNoteUrl(e.target.value)}
            placeholder="Link to drum notes"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="bass-url" className="mb-1.5 block text-sm text-muted-foreground">
            Bass Note URL
          </label>
          <input
            id="bass-url"
            type="url"
            value={bassNoteUrl}
            onChange={(e) => setBassNoteUrl(e.target.value)}
            placeholder="Link to bass notes"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="notes" className="mb-1.5 block text-sm text-muted-foreground">
            Additional Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tempo, key, arrangement notes..."
            rows={3}
            className="input-field resize-none"
          />
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? loadingLabel : submitLabel}
      </button>
    </form>
  );
}

export { emptyValues as emptySongFormValues };
