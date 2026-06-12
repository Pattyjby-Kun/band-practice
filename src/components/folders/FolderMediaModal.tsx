"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { FolderMedia, FolderMediaType } from "@/types/activity";

interface FolderMediaModalProps {
  isOpen: boolean;
  accessToken: string;
  folderId: string;
  media?: FolderMedia | null;
  onClose: () => void;
  onSaved: (media: FolderMedia) => void;
  onDeleted?: (mediaId: string) => void;
}

const MEDIA_TYPES: { value: FolderMediaType; label: string }[] = [
  { value: "google_drive", label: "Google Drive" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

export default function FolderMediaModal({
  isOpen,
  accessToken,
  folderId,
  media,
  onClose,
  onSaved,
  onDeleted,
}: FolderMediaModalProps) {
  const isEdit = Boolean(media);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [mediaType, setMediaType] = useState<FolderMediaType>("google_drive");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(media?.title ?? "");
      setUrl(media?.url ?? "");
      setMediaType(media?.media_type ?? "google_drive");
      setNotes(media?.notes ?? "");
      setError("");
      setLoading(false);
      setDeleting(false);
    }
  }, [isOpen, media]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!url.trim()) throw new Error("URL is required");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const body = {
        title: title.trim(),
        url: url.trim(),
        media_type: mediaType,
        notes: notes.trim() || null,
      };

      const res = await fetch(
        isEdit ? `/api/media/${media!.id}` : `/api/folders/${folderId}/media`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save media");
      }

      onSaved(await res.json());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save media");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!media || !onDeleted) return;
    if (!confirm(`Delete "${media.title}"?`)) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/media/${media.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete media");
      }

      onDeleted(media.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete media");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="glass-card relative w-full max-w-md animate-slide-up rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? "Edit Media" : "Add Media"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="media-title" className="mb-1.5 block text-sm font-medium text-foreground/80">
              Title
            </label>
            <input
              id="media-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Band Rehearsal"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="media-url" className="mb-1.5 block text-sm font-medium text-foreground/80">
              URL
            </label>
            <input
              id="media-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="media-type" className="mb-1.5 block text-sm font-medium text-foreground/80">
              Media Type
            </label>
            <select
              id="media-type"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as FolderMediaType)}
              className="input-field"
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="media-notes" className="mb-1.5 block text-sm font-medium text-foreground/80">
              Notes (optional)
            </label>
            <textarea
              id="media-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Optional notes about this recording"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Media"}
            </button>
            {isEdit && onDeleted ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
