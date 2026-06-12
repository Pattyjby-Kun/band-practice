"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Search,
  SortAsc,
  MapPin,
  ExternalLink,
  Pencil,
  Video,
} from "lucide-react";
import type { Folder, Song } from "@/types";
import { getRouteParamId } from "@/lib/ids";
import { formatRehearsalDate, getRehearsalCountdown } from "@/lib/utils";
import Header from "@/components/Header";
import SongCard from "@/components/SongCard";
import EmptyState from "@/components/EmptyState";
import FolderMediaSection, {
  type FolderMediaSectionHandle,
} from "@/components/folders/FolderMediaSection";
import CreateFolderModal, { type CreateFolderData } from "@/components/CreateFolderModal";
import EditSongModal from "@/components/EditSongModal";
import { useAuth } from "@/components/AuthProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = getRouteParamId(params.id);
  const { session } = useAuth();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "votes">("order");
  const [dragId, setDragId] = useState<string | null>(null);
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const mediaSectionRef = useRef<FolderMediaSectionHandle>(null);

  const isOwner =
    Boolean(session?.user?.id) &&
    Boolean(folder?.owner_id) &&
    session?.user?.id === folder?.owner_id;

  const isAuthenticated = Boolean(session?.access_token);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchData = useCallback(async () => {
    if (!folderId) {
      setFolder(null);
      setSongs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const folderHeaders = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      const [folderRes, songsRes] = await Promise.all([
        fetch(`/api/folders/${folderId}`, { headers: folderHeaders }),
        fetch(`/api/songs?folder_id=${encodeURIComponent(folderId)}&sort=${sortBy}`),
      ]);

      if (folderRes.ok) {
        setFolder(await folderRes.json());
      } else {
        setFolder(null);
      }

      if (songsRes.ok) {
        setSongs(await songsRes.json());
      } else {
        setSongs([]);
      }
    } catch {
      setFolder(null);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [folderId, sortBy, session?.access_token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleVote(songId: string, voteType: "like" | "dislike") {
    if (!session?.access_token) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`);
      return;
    }

    const res = await fetch("/api/votes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ song_id: songId, vote_type: voteType }),
    });

    if (res.status === 401) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV === "development") {
        console.error("[votes] client error:", data);
      }
      return;
    }

    const updated = await res.json();
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, ...updated } : s))
    );
  }

  async function handleDelete(songId: string) {
    if (!session?.access_token) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`);
      return;
    }
    if (!confirm("Delete this song?")) return;

    const res = await fetch(`/api/songs/${songId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      if (folder) {
        setFolder({ ...folder, song_count: (folder.song_count ?? 1) - 1 });
      }
    }
  }

  async function handleReorder(fromId: string, toId: string) {
    if (!isAuthenticated) return;
    if (fromId === toId) return;

    const current = [...songs];
    const fromIndex = current.findIndex((s) => s.id === fromId);
    const toIndex = current.findIndex((s) => s.id === toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    setSongs(current);

    await fetch("/api/songs/reorder", {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        folder_id: folderId,
        song_ids: current.map((s) => s.id),
      }),
    });
  }

  async function handleUpdateFolder(data: CreateFolderData) {
    if (!session?.access_token || !folderId) {
      throw new Error("Sign in required");
    }

    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: data.name,
        rehearsal_date: data.rehearsalDate,
        practice_location_name: data.practiceLocationName || null,
        practice_location_url: data.practiceLocationUrl || null,
      }),
    });

    if (res.status === 403) {
      throw new Error("Only the folder owner can edit this folder");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update folder");
    }

    setFolder(await res.json());
  }

  async function handleDeleteFolder() {
    if (!session?.access_token || !folderId) {
      throw new Error("Sign in required");
    }

    const res = await fetch(`/api/folders/${folderId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.status === 403) {
      throw new Error("Only the folder owner can delete this folder");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete folder");
    }

    router.push("/");
  }

  function handleAddSong() {
    if (!isAuthenticated || !folderId) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`);
      return;
    }

    router.push(`/folder/${folderId}/add`);
  }

  function handleAddMedia() {
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`);
      return;
    }

    mediaSectionRef.current?.openAddModal();
  }

  async function handleRefreshAll() {
    await fetchData();
    await mediaSectionRef.current?.refresh();
  }

  function stopContextMenu(event: React.MouseEvent) {
    event.stopPropagation();
  }

  const filteredSongs = songs.filter((s) =>
    s.song_name.toLowerCase().includes(search.toLowerCase())
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {isOwner && (
        <button
          type="button"
          onClick={() => setEditFolderOpen(true)}
          className="btn-secondary text-sm"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Edit Folder</span>
        </button>
      )}
      {isAuthenticated && folderId && (
        <Link href={`/folder/${folderId}/add`} className="btn-secondary text-sm">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Song</span>
        </Link>
      )}
    </div>
  );

  if (loading) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl">
        <Header title="Loading..." backHref="/" />
        <div className="space-y-4 px-4 py-6">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-28 animate-pulse rounded-2xl" />
          ))}
        </div>
      </main>
    );
  }

  if (!folder || !folderId) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl">
        <Header title="Folder not found" backHref="/" />
        <div className="px-4 py-16 text-center text-muted-foreground">
          This rehearsal folder does not exist.
        </div>
      </main>
    );
  }

  const countdown = getRehearsalCountdown(folder.rehearsal_date);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl pb-8">
      <Header
        title={folder.name}
        subtitle={`${formatRehearsalDate(folder.rehearsal_date)} · ${countdown}`}
        backHref="/"
        action={headerActions}
      />

      <div className="space-y-3 border-b border-border px-4 py-4 sm:px-6">
        {folder.owner_display_name && (
          <p className="text-sm text-muted-foreground">
            👑 Owner: {folder.owner_display_name}
          </p>
        )}

        {folder.practice_location_url ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-foreground/80">
              <MapPin className="h-4 w-4 shrink-0 text-accent" />
              <span>{folder.practice_location_name || "Rehearsal Location"}</span>
            </p>
            <a
              href={folder.practice_location_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary w-fit text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              Open Google Maps
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Location not specified</p>
        )}
      </div>

      <ContextMenu>
        <ContextMenuTrigger className="block min-h-[calc(100svh-18rem)]">
          <div onContextMenu={stopContextMenu}>
            <FolderMediaSection
              ref={mediaSectionRef}
              folderId={folderId}
              accessToken={session?.access_token}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {songs.length === 0 ? (
            <div onContextMenu={stopContextMenu}>
              <EmptyState folderId={folderId} canAdd={isAuthenticated} />
            </div>
          ) : (
            <div className="px-4 py-6 sm:px-6">
              <div
                className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center"
                onContextMenu={stopContextMenu}
              >
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    type="search"
                    placeholder="Search songs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field input-field--with-icon w-full"
                    aria-label="Search songs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === "order" ? "votes" : "order")}
                  className="btn-secondary shrink-0 text-sm"
                >
                  <SortAsc className="h-4 w-4" />
                  {sortBy === "order" ? "Custom Order" : "By Votes"}
                </button>
              </div>

              {isAuthenticated && sortBy === "order" && (
                <p className="mb-4 text-xs text-muted-foreground/60">
                  Drag songs to reorder · {filteredSongs.length} song
                  {filteredSongs.length !== 1 ? "s" : ""}
                </p>
              )}
              {!isAuthenticated && (
                <p className="mb-4 text-xs text-muted-foreground/60">
                  {filteredSongs.length} song
                  {filteredSongs.length !== 1 ? "s" : ""}
                </p>
              )}
              {isAuthenticated && sortBy === "votes" && (
                <p className="mb-4 text-xs text-muted-foreground/60">
                  {filteredSongs.length} song
                  {filteredSongs.length !== 1 ? "s" : ""}
                </p>
              )}

              <div className="space-y-4">
                {filteredSongs.map((song) => (
                  <div key={song.id} onContextMenu={stopContextMenu}>
                    <SongCard
                      song={song}
                      onVote={handleVote}
                      onEdit={(id) => {
                        if (!isAuthenticated) {
                          router.push(
                            `/login?returnUrl=${encodeURIComponent(`/folder/${folderId}`)}`
                          );
                          return;
                        }
                        setEditSong(songs.find((s) => s.id === id) ?? null);
                      }}
                      onDelete={handleDelete}
                      canEdit={isAuthenticated}
                      draggable={isAuthenticated && sortBy === "order"}
                      isDragging={dragId === song.id}
                      onDragStart={(_e, id) => setDragId(id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(_e, id) => {
                        if (dragId !== null) handleReorder(dragId, id);
                        setDragId(null);
                      }}
                    />
                  </div>
                ))}
              </div>

              {filteredSongs.length === 0 && search && (
                <p
                  className="py-8 text-center text-muted-foreground"
                  onContextMenu={stopContextMenu}
                >
                  No songs match &ldquo;{search}&rdquo;
                </p>
              )}
            </div>
          )}
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem
            disabled={!isAuthenticated}
            onClick={handleAddSong}
          >
            <Plus className="h-4 w-4" />
            Add Song
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!isAuthenticated}
            onClick={handleAddMedia}
          >
            <Video className="h-4 w-4" />
            Add Media
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={loading}
            onClick={() => void handleRefreshAll()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <CreateFolderModal
        isOpen={editFolderOpen}
        mode="edit"
        folder={folder}
        onClose={() => setEditFolderOpen(false)}
        onSubmit={handleUpdateFolder}
        onDelete={handleDeleteFolder}
      />

      {session?.access_token && (
        <EditSongModal
          isOpen={editSong !== null}
          song={editSong}
          accessToken={session.access_token}
          onClose={() => setEditSong(null)}
          onSaved={(updated) =>
            setSongs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
          }
        />
      )}
    </main>
  );
}
