"use client";

import { Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { useThemeToggle } from "@/hooks/useThemeToggle";

export default function ThemeToggle() {
  const { mounted, isDark, toggleTheme } = useThemeToggle();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-muted"
        aria-hidden
      />
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => toggleTheme(buttonRef.current)}
      className="btn-secondary text-sm"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </button>
  );
}
