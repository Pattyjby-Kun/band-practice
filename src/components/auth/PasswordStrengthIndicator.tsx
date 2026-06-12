"use client";

import { getPasswordStrength, type PasswordStrength } from "@/lib/auth";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const labels: Record<PasswordStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const colors: Record<PasswordStrength, string> = {
  weak: "bg-red-400",
  medium: "bg-yellow-400",
  strong: "bg-green-400",
};

const widths: Record<PasswordStrength, string> = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

export default function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);

  if (!strength) return null;

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span
          className={
            strength === "weak"
              ? "text-red-400"
              : strength === "medium"
                ? "text-yellow-400"
                : "text-green-400"
          }
        >
          {labels[strength]}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors[strength]} ${widths[strength]}`}
        />
      </div>
    </div>
  );
}
