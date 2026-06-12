"use client";

import Link from "next/link";
import { Music, Plus } from "lucide-react";

interface EmptyStateProps {
  folderId: string;
  canAdd?: boolean;
}

export default function EmptyState({ folderId, canAdd = true }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
        <Music className="h-16 w-16 text-primary-light" strokeWidth={1.5} />
      </div>
      <h2 className="mb-2 text-xl font-semibold text-foreground">No songs yet</h2>
      <p className="mb-8 max-w-sm text-foreground/50">
        {canAdd
          ? "Add your first song to start building the rehearsal setlist."
          : "This folder has no songs yet."}
      </p>
      {canAdd && (
        <Link
          href={`/folder/${folderId}/add`}
          className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base"
        >
          <Plus className="h-5 w-5" />
          Add Song
        </Link>
      )}
    </div>
  );
}
