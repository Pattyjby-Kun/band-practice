"use client";

import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  label?: string;
}

export default function FAB({ onClick, label = "Create folder" }: FABProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-primary/40 active:scale-95 sm:bottom-8 sm:right-8"
    >
      <Plus className="h-7 w-7" strokeWidth={2.5} />
    </button>
  );
}
