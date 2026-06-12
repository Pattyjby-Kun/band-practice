"use client";

import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { getUserAvatarUrl, getUserInitials } from "@/lib/user-profile";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

interface UserAvatarProps {
  user: User;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export default function UserAvatar({
  user,
  size = "md",
  className,
}: UserAvatarProps) {
  const avatarUrl = getUserAvatarUrl(user);
  const initials = getUserInitials(user);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary font-semibold text-white ring-2 ring-border",
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
