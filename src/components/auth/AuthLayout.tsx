"use client";

import Link from "next/link";
import { Guitar } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="mb-8 text-center animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
            <Guitar className="h-6 w-6 text-white" />
          </div>
        </Link>
        <h1 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
          🎵 {title}
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      </div>

      <div className="glass-card w-full max-w-md animate-slide-up rounded-2xl p-6 sm:p-8">
        {children}
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
    </main>
  );
}
