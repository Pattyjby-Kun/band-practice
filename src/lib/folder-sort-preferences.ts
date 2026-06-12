import type { Folder } from "@/types";

export type FolderSortField = "date" | "name";
export type FolderSortOrder = "asc" | "desc";

export interface FolderSortPreferences {
  field: FolderSortField;
  dateOrder: FolderSortOrder;
  nameOrder: FolderSortOrder;
}

export const FOLDER_SORT_STORAGE_KEY = "music.homeFolderSort";

const DEFAULT_PREFERENCES: FolderSortPreferences = {
  field: "date",
  dateOrder: "asc",
  nameOrder: "asc",
};

export function loadFolderSortPreferences(): FolderSortPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = localStorage.getItem(FOLDER_SORT_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<FolderSortPreferences>;
    return {
      field: parsed.field === "name" ? "name" : "date",
      dateOrder: parsed.dateOrder === "desc" ? "desc" : "asc",
      nameOrder: parsed.nameOrder === "desc" ? "desc" : "asc",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveFolderSortPreferences(
  preferences: FolderSortPreferences
): void {
  localStorage.setItem(FOLDER_SORT_STORAGE_KEY, JSON.stringify(preferences));
}

export function sortFolders(
  folders: Folder[],
  preferences: FolderSortPreferences
): Folder[] {
  return [...folders].sort((a, b) => {
    if (preferences.field === "date") {
      const comparison = a.rehearsal_date.localeCompare(b.rehearsal_date);
      return preferences.dateOrder === "asc" ? comparison : -comparison;
    }

    const comparison = a.name.localeCompare(b.name, undefined, {
      sensitivity: "base",
    });
    return preferences.nameOrder === "asc" ? comparison : -comparison;
  });
}

export function getDateSortLabel(order: FolderSortOrder): string {
  return order === "desc" ? "Newest First" : "Oldest First";
}

export function getNameSortLabel(order: FolderSortOrder): string {
  return order === "desc" ? "Z → A" : "A → Z";
}

export function getHeaderSortLabel(preferences: FolderSortPreferences): string {
  if (preferences.field === "date") {
    return `By Date (${getDateSortLabel(preferences.dateOrder)})`;
  }

  return `By Name (${getNameSortLabel(preferences.nameOrder)})`;
}
