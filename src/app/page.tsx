"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  Guitar,
  RefreshCw,
  SortAsc,
  ArrowDownAZ,
  Calendar,
} from "lucide-react";
import type { Folder } from "@/types";
import FolderCard from "@/components/FolderCard";
import FAB from "@/components/FAB";
import CreateFolderModal, {
  type CreateFolderData,
} from "@/components/CreateFolderModal";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useActiveBand } from "@/hooks/useActiveBand";
import { useBands } from "@/hooks/useBands";
import {
  sortFolders,
  getDateSortLabel,
  getHeaderSortLabel,
  getNameSortLabel,
  loadFolderSortPreferences,
  saveFolderSortPreferences,
  type FolderSortPreferences,
} from "@/lib/folder-sort-preferences";

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();
  const { showToast } = useToast();
  const { activeBandId, activeBand, activeBandVersion } = useActiveBand();
  const { loading: bandsLoading } = useBands();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [sortPreferences, setSortPreferences] = useState<FolderSortPreferences>(
    loadFolderSortPreferences
  );

  const fetchFolders = useCallback(async () => {
    if (!session?.access_token || !activeBandId) {
      setFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/folders?band_id=${encodeURIComponent(activeBandId)}&sort=${sortPreferences.field}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (res.ok) {
        const data: Folder[] = await res.json();
        setFolders(sortFolders(data, sortPreferences));
      } else {
        setFolders([]);
      }
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, activeBandId, activeBandVersion, sortPreferences]);

  useEffect(() => {
    if (bandsLoading) return;
    void fetchFolders();
  }, [bandsLoading, fetchFolders]);

  useEffect(() => {
    saveFolderSortPreferences(sortPreferences);
  }, [sortPreferences]);

  function handleOpenCreate() {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      return;
    }
    if (!activeBandId) {
      return;
    }
    setModalOpen(true);
  }

  function handleSortByDate() {
    setSortPreferences((current) => ({
      ...current,
      field: "date",
      dateOrder:
        current.field === "date"
          ? current.dateOrder === "asc"
            ? "desc"
            : "asc"
          : current.dateOrder,
    }));
  }

  function handleSortByName() {
    setSortPreferences((current) => ({
      ...current,
      field: "name",
      nameOrder:
        current.field === "name"
          ? current.nameOrder === "asc"
            ? "desc"
            : "asc"
          : current.nameOrder,
    }));
  }

  function handleHeaderSortToggle() {
    setSortPreferences((current) => {
      if (current.field === "date") {
        return {
          ...current,
          field: "name",
        };
      }

      return {
        ...current,
        field: "date",
      };
    });
  }

  async function handleCreateFolder(data: CreateFolderData) {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      throw new Error("Sign in required");
    }
    if (!activeBandId) {
      throw new Error("Select a band first");
    }

    const res = await fetch("/api/folders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        band_id: activeBandId,
        name: data.name,
        rehearsal_date: data.rehearsalDate,
        practice_location_name: data.practiceLocationName || null,
        practice_location_url: data.practiceLocationUrl || null,
      }),
    });

    if (res.status === 401) {
      router.push("/login?returnUrl=/");
      throw new Error("Sign in required");
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create folder");
    }

    const folder = await res.json();
    router.push(`/folder/${folder.id}`);
  }

  function isFolderOwner(folder: Folder): boolean {
    return Boolean(
      session?.user?.id && folder.owner_id && session.user.id === folder.owner_id
    );
  }

  function handleEditFolder(folder: Folder) {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      return;
    }
    setEditFolder(folder);
  }

  async function handleUpdateFolder(data: CreateFolderData) {
    if (!session?.access_token || !editFolder) {
      throw new Error("Sign in required");
    }

    const res = await fetch(`/api/folders/${editFolder.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
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

    const updated = await res.json();
    setFolders((prev) =>
      sortFolders(
        prev.map((folder) => (folder.id === updated.id ? updated : folder)),
        sortPreferences
      )
    );
    showToast("Folder updated");
  }

  async function handleDeleteFolder(folder: Folder) {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      return;
    }

    if (!confirm("Are you sure you want to delete this rehearsal folder?")) {
      return;
    }

    const res = await fetch(`/api/folders/${folder.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (res.status === 403) {
      showToast("Only the folder owner can delete this folder", "error");
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Failed to delete folder", "error");
      return;
    }

    setFolders((prev) => prev.filter((item) => item.id !== folder.id));
    showToast("Folder deleted");
  }

  const showSelectBandMessage = !bandsLoading && session && !activeBandId;
  const showLoading = bandsLoading || loading;
  const canUseFolderActions = Boolean(activeBandId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
              <Guitar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground sm:text-xl">
                {activeBand?.name ?? "Band Practice"}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">Rehearsal Folders</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHeaderSortToggle}
              className="btn-secondary text-sm"
              aria-label="Toggle sort field"
              disabled={!activeBandId}
            >
              <SortAsc className="h-4 w-4" />
              <span className="hidden sm:inline">
                {getHeaderSortLabel(sortPreferences)}
              </span>
            </button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <ContextMenu>
        <ContextMenuTrigger className="block min-h-[calc(100svh-5.5rem)]">
          <div className="px-4 py-6 sm:px-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Rehearsal Folders
            </h2>

            {showLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="glass-card h-36 animate-pulse rounded-2xl"
                  />
                ))}
              </div>
            ) : showSelectBandMessage ? (
              <div className="flex flex-col items-center py-16 text-center animate-fade-in">
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  Create your first band
                </h3>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Use the sidebar to create a band, then add rehearsal folders here.
                </p>
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center animate-fade-in">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
                  <Guitar className="h-12 w-12 text-primary-light" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  No rehearsals yet
                </h3>
                <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                  Tap the + button to create your first rehearsal folder for{" "}
                  {activeBand?.name ?? "this band"}.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1">
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    isOwner={isFolderOwner(folder)}
                    onEdit={handleEditFolder}
                    onDelete={handleDeleteFolder}
                  />
                ))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-56">
          <ContextMenuItem
            disabled={!canUseFolderActions}
            onClick={handleOpenCreate}
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!canUseFolderActions}
            onClick={handleSortByDate}
          >
            <Calendar className="h-4 w-4" />
            Sort By Date
            <span className="ml-auto text-xs text-muted-foreground">
              {sortPreferences.field === "date"
                ? getDateSortLabel(sortPreferences.dateOrder)
                : getDateSortLabel("asc")}
            </span>
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!canUseFolderActions}
            onClick={handleSortByName}
          >
            <ArrowDownAZ className="h-4 w-4" />
            Sort By Name
            <span className="ml-auto text-xs text-muted-foreground">
              {sortPreferences.field === "name"
                ? getNameSortLabel(sortPreferences.nameOrder)
                : getNameSortLabel("asc")}
            </span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!canUseFolderActions || showLoading}
            onClick={() => void fetchFolders()}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {activeBandId ? <FAB onClick={handleOpenCreate} /> : null}
      <CreateFolderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateFolder}
      />
      <CreateFolderModal
        isOpen={editFolder !== null}
        mode="edit"
        folder={editFolder}
        onClose={() => setEditFolder(null)}
        onSubmit={handleUpdateFolder}
      />
    </main>
  );
}
