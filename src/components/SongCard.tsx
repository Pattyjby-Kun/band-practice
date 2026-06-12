"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Check,
  GripVertical,
  Trash2,
  Pencil,
} from "lucide-react";
import type { Song } from "@/types";
import { copyToClipboard } from "@/lib/utils";
import { detectUrlSource } from "@/lib/metadata";

interface SongCardProps {
  song: Song;
  onVote: (songId: string, voteType: "like" | "dislike") => Promise<void>;
  onEdit?: (songId: string) => void;
  onDelete?: (songId: string) => Promise<void>;
  canEdit?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, songId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, songId: string) => void;
  isDragging?: boolean;
}

function LinkRow({
  label,
  url,
  icon,
}: {
  label: string;
  url: string | null | undefined;
  icon?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  if (!url) return null;

  async function handleCopy() {
    const success = await copyToClipboard(url!);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground/80">{url}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={`Open ${label}`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export default function SongCard({
  song,
  onVote,
  onEdit,
  onDelete,
  canEdit = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging = false,
}: SongCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);

  const likes = song.likes ?? 0;
  const dislikes = song.dislikes ?? 0;
  const totalVotes = likes + dislikes;
  const voteScore = song.vote_score ?? likes - dislikes;
  const source = detectUrlSource(song.song_url);

  async function handleVote(voteType: "like" | "dislike") {
    if (voting) return;
    setVoting(true);
    try {
      await onVote(song.id, voteType);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, song.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, song.id)}
      className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${
        isDragging ? "opacity-50 scale-95" : "hover:border-primary/30"
      }`}
    >
      <div className="flex gap-4 p-4">
        {draggable && (
          <div className="flex shrink-0 cursor-grab items-center text-muted-foreground/60 active:cursor-grabbing">
            <GripVertical className="h-5 w-5" />
          </div>
        )}

        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/50">
          {song.cover_image ? (
            <Image
              src={song.cover_image}
              alt={song.song_name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl">
              🎵
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">{song.song_name}</h3>
              {source !== "unknown" && (
                <span className="mt-0.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                  {source}
                </span>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`text-lg font-bold ${
                  voteScore > 0
                    ? "text-green-400"
                    : voteScore < 0
                      ? "text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                {voteScore > 0 ? "+" : ""}
                {voteScore}
              </p>
              <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleVote("like")}
              disabled={voting}
              className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm transition-all hover:bg-green-500/20 hover:text-green-400 active:scale-95 disabled:opacity-50"
            >
              <ThumbsUp className="h-4 w-4" />
              <span>{likes}</span>
            </button>
            <button
              type="button"
              onClick={() => handleVote("dislike")}
              disabled={voting}
              className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm transition-all hover:bg-red-500/20 hover:text-red-400 active:scale-95 disabled:opacity-50"
            >
              <ThumbsDown className="h-4 w-4" />
              <span>{dislikes}</span>
            </button>

            <div className="ml-auto flex gap-1">
              {source === "youtube" || source === "spotify" ? (
                <a
                  href={song.song_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary/20 p-1.5 text-primary-light transition-colors hover:bg-primary/30"
                  aria-label="Open song"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(song.id)}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Edit song"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              {canEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(song.id)}
                  className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  aria-label="Delete song"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={expanded ? "Collapse details" : "Expand details"}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="animate-slide-down space-y-2 border-t border-border px-4 py-4">
          <LinkRow label="Song URL" url={song.song_url} />
          <LinkRow label="Chord Sheet URL" url={song.chord_url} />
          <LinkRow label="Drum Note URL" url={song.drum_note_url} />
          <LinkRow label="Bass Note URL" url={song.bass_note_url} />
          {song.notes && (
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm text-foreground/80 whitespace-pre-wrap">{song.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
