"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { ExternalLink, Pencil, Plus, Video } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import FolderMediaModal from "@/components/folders/FolderMediaModal";
import { Badge } from "@/components/ui/badge";
import { mediaTypeLabel } from "@/lib/folder-media";
import type { FolderMedia } from "@/types/activity";

interface FolderMediaSectionProps {
  folderId: string;
  accessToken: string | undefined;
  isAuthenticated: boolean;
}

export interface FolderMediaSectionHandle {
  openAddModal: () => void;
  refresh: () => Promise<void>;
}

function formatMediaDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function mediaEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("drum")) return "🥁";
  if (lower.includes("vocal") || lower.includes("voice")) return "🎤";
  return "🎥";
}

export default forwardRef<FolderMediaSectionHandle, FolderMediaSectionProps>(
  function FolderMediaSection(
    { folderId, accessToken, isAuthenticated },
    ref
  ) {
  const [mediaItems, setMediaItems] = useState<FolderMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<FolderMedia | null>(null);

  const fetchMedia = useCallback(async () => {
    if (!accessToken) {
      setMediaItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.media ?? []);
      } else {
        setMediaItems([]);
      }
    } catch {
      setMediaItems([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, folderId]);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  function openAddModal() {
    setEditingMedia(null);
    setModalOpen(true);
  }

  useImperativeHandle(
    ref,
    () => ({
      openAddModal,
      refresh: fetchMedia,
    }),
    [fetchMedia]
  );

  function openEditModal(item: FolderMedia) {
    setEditingMedia(item);
    setModalOpen(true);
  }

  function handleSaved(item: FolderMedia) {
    setMediaItems((prev) => {
      const exists = prev.some((entry) => entry.id === item.id);
      if (exists) {
        return prev.map((entry) => (entry.id === item.id ? item : entry));
      }
      return [item, ...prev];
    });
  }

  function handleDeleted(mediaId: string) {
    setMediaItems((prev) => prev.filter((entry) => entry.id !== mediaId));
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="border-b border-border px-4 py-4 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <Video className="h-4 w-4" />
          Rehearsal Media
        </h2>
        {accessToken ? (
          <button type="button" onClick={openAddModal} className="btn-secondary text-sm">
            <Plus className="h-4 w-4" />
            Add Media
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-24 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rehearsal recordings yet. Add links to Google Drive, YouTube, or other review
          media.
        </p>
      ) : (
        <div className="space-y-3">
          {mediaItems.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {mediaEmoji(item.title)} {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{mediaTypeLabel(item.media_type)}</Badge>
                    {item.created_by_display_name ? (
                      <span className="text-xs text-muted-foreground">
                        by {item.created_by_display_name}
                      </span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatMediaDate(item.created_at)}
                    </span>
                  </div>
                  {item.notes ? (
                    <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Link
                  </a>
                  {accessToken ? (
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="btn-secondary text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {accessToken ? (
        <FolderMediaModal
          isOpen={modalOpen}
          accessToken={accessToken}
          folderId={folderId}
          media={editingMedia}
          onClose={() => {
            setModalOpen(false);
            setEditingMedia(null);
          }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </section>
  );
});
