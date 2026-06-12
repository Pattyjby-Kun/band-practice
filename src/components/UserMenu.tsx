"use client";

import Link from "next/link";
import { ChevronDown, LogIn, LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import UserAvatar from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeToggle } from "@/hooks/useThemeToggle";
import {
  getUserDisplayName,
  getUserEmail,
} from "@/lib/user-profile";
import { cn } from "@/lib/utils";

export default function UserMenu() {
  const { session, loading, signOut } = useAuth();
  const { mounted, isDark, toggleTheme } = useThemeToggle();

  if (loading || !mounted) {
    return (
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" aria-hidden />
    );
  }

  if (!session) {
    return (
      <Link href="/login" className="btn-secondary text-sm">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    );
  }

  const user = session.user;
  const displayName = getUserDisplayName(user);
  const email = getUserEmail(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex max-w-[12rem] items-center gap-2 rounded-xl border border-border bg-muted/50 px-1.5 py-1",
          "text-sm text-foreground transition-colors outline-none",
          "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        )}
        aria-label="Open profile menu"
      >
        <UserAvatar user={user} size="sm" className="ring-0" />
        <span className="hidden truncate font-medium sm:inline">{displayName}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0 duration-200">
        <DropdownMenuGroup className="border-b border-border px-3 pb-3 pt-3">
          <DropdownMenuLabel className="px-0 pb-2 text-xs uppercase tracking-wide">
            Profile
          </DropdownMenuLabel>
          <div className="flex items-start gap-3">
            <UserAvatar user={user} size="lg" className="ring-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            onClick={(event) => {
              toggleTheme(event.currentTarget);
            }}
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Theme
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
