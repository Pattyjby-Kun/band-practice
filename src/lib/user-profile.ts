import type { User } from "@supabase/supabase-js";

export function getUserAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = metadata?.avatar_url;
  if (typeof avatarUrl === "string" && avatarUrl.length > 0) {
    return avatarUrl;
  }
  const picture = metadata?.picture;
  if (typeof picture === "string" && picture.length > 0) {
    return picture;
  }
  return null;
}

export function getUserDisplayName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const displayName = metadata?.display_name;
  if (typeof displayName === "string" && displayName.trim()) {
    return displayName.trim();
  }
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }
  const name = metadata?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }
  if (user.email) {
    return user.email.split("@")[0] ?? "Member";
  }
  return "Member";
}

export function getUserInitials(user: User): string {
  const displayName = getUserDisplayName(user);
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function getUserEmail(user: User): string | null {
  return user.email ?? null;
}
