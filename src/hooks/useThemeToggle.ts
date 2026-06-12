"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

function setRevealOrigin(origin: HTMLElement) {
  const { top, left, width, height } = origin.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  document.documentElement.style.setProperty("--theme-reveal-x", `${x}px`);
  document.documentElement.style.setProperty("--theme-reveal-y", `${y}px`);
  document.documentElement.style.setProperty("--theme-reveal-radius", `${radius}px`);
}

export function useThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(
    (origin?: HTMLElement | null) => {
      const next = resolvedTheme === "dark" ? "light" : "dark";

      const applyTheme = () => {
        setTheme(next);
      };

      if (origin) {
        setRevealOrigin(origin);
      }

      if (
        typeof document !== "undefined" &&
        "startViewTransition" in document &&
        typeof document.startViewTransition === "function"
      ) {
        document.startViewTransition(applyTheme);
        return;
      }

      document.documentElement.classList.add("theme-transition-active");
      applyTheme();
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transition-active");
      }, 450);
    },
    [resolvedTheme, setTheme]
  );

  return {
    mounted,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    toggleTheme,
  };
}
