"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Folder } from "@/types";

export interface FolderFormData {
  name: string;
  rehearsalDate: string;
  practiceLocationName: string;
  practiceLocationUrl: string;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  mode?: "create" | "edit";
  folder?: Folder | null;
  onClose: () => void;
  onSubmit: (data: FolderFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function CreateFolderModal({
  isOpen,
  mode = "create",
  folder = null,
  onClose,
  onSubmit,
  onDelete,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [rehearsalDate, setRehearsalDate] = useState("");
  const [practiceLocationName, setPracticeLocationName] = useState("");
  const [practiceLocationUrl, setPracticeLocationUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = mode === "edit";

  useEffect(() => {
    if (isOpen) {
      if (isEdit && folder) {
        setName(folder.name);
        setRehearsalDate(folder.rehearsal_date);
        setPracticeLocationName(folder.practice_location_name ?? "");
        setPracticeLocationUrl(folder.practice_location_url ?? "");
      } else {
        setName("");
        setRehearsalDate("");
        setPracticeLocationName("");
        setPracticeLocationUrl("");
      }
      setError("");
    }
  }, [isOpen, isEdit, folder]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }
    if (!rehearsalDate) {
      setError("Rehearsal date is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        rehearsalDate,
        practiceLocationName: practiceLocationName.trim(),
        practiceLocationUrl: practiceLocationUrl.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save folder");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm("Delete this folder and all its songs? This cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete folder");
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
            {isEdit ? "Edit Rehearsal" : "New Rehearsal"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="folder-name" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Folder Name <span className="text-accent">*</span>
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Saturday Night Practice"
              className="input-field"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="rehearsal-date" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Rehearsal Date <span className="text-accent">*</span>
            </label>
            <input
              id="rehearsal-date"
              type="date"
              value={rehearsalDate}
              onChange={(e) => setRehearsalDate(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="practice-location-name" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Practice Location Name
            </label>
            <input
              id="practice-location-name"
              type="text"
              value={practiceLocationName}
              onChange={(e) => setPracticeLocationName(e.target.value)}
              placeholder="e.g. Studio A, Community Hall"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="practice-location-url" className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Practice Location Google Maps URL
            </label>
            <input
              id="practice-location-url"
              type="url"
              value={practiceLocationUrl}
              onChange={(e) => setPracticeLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="input-field"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading || deleting} className="btn-primary w-full">
            {loading
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Folder"}
          </button>

          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="w-full rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Folder"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export type { FolderFormData as CreateFolderData };
