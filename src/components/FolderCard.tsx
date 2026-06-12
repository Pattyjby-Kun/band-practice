"use client";

import Link from "next/link";
import { Calendar, Clock, MoreHorizontal, Music, Pencil, Trash2 } from "lucide-react";
import type { Folder } from "@/types";
import { formatRehearsalDate, getRehearsalCountdown, isRehearsalPast } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderCardProps {
  folder: Folder;
  isOwner?: boolean;
  onEdit?: (folder: Folder) => void;
  onDelete?: (folder: Folder) => void;
}

function FolderCardActionsMenu({
  folder,
  onEdit,
  onDelete,
  variant,
}: {
  folder: Folder;
  onEdit?: (folder: Folder) => void;
  onDelete?: (folder: Folder) => void;
  variant: "context" | "dropdown";
}) {
  const Item = variant === "context" ? ContextMenuItem : DropdownMenuItem;

  return (
    <>
      <Item
        onClick={() => {
          onEdit?.(folder);
        }}
      >
        <Pencil className="h-4 w-4" />
        Edit Folder
      </Item>
      <Item
        variant="destructive"
        onClick={() => {
          onDelete?.(folder);
        }}
      >
        <Trash2 className="h-4 w-4" />
        Delete Folder
      </Item>
    </>
  );
}

export default function FolderCard({
  folder,
  isOwner = false,
  onEdit,
  onDelete,
}: FolderCardProps) {
  const countdown = getRehearsalCountdown(folder.rehearsal_date);
  const isPast = isRehearsalPast(folder.rehearsal_date);
  const showActions = isOwner && onEdit && onDelete;

  const cardBody = (
    <div className="glass-card group relative rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]">
      <Link
        href={`/folder/${folder.id}`}
        className="block rounded-2xl p-5 pr-12"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary-light">
            {folder.name}
          </h2>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              isPast
                ? "bg-muted text-muted-foreground"
                : "bg-primary/20 text-primary-light"
            }`}
          >
            {countdown}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-secondary" />
            <span>{formatRehearsalDate(folder.rehearsal_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music className="h-4 w-4 shrink-0 text-accent" />
            <span>
              {folder.song_count ?? 0} song{(folder.song_count ?? 0) === 1 ? "" : "s"}
            </span>
          </div>
          {!isPast && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{countdown}</span>
            </div>
          )}
        </div>
      </Link>

      {showActions ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="absolute bottom-3 right-3 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            aria-label={`Folder actions for ${folder.name}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <FolderCardActionsMenu
              folder={folder}
              onEdit={onEdit}
              onDelete={onDelete}
              variant="dropdown"
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );

  if (!showActions) {
    return cardBody;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block w-full">{cardBody}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <FolderCardActionsMenu
          folder={folder}
          onEdit={onEdit}
          onDelete={onDelete}
          variant="context"
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}
