export const BAND_ROLES = [
  "Vocal",
  "Guitar",
  "Bass",
  "Drums",
  "Keyboard",
  "Piano",
  "Saxophone",
  "Violin",
  "Producer",
  "Sound Engineer",
  "Other",
] as const;

export type BandRole = (typeof BAND_ROLES)[number];

export type PasswordStrength = "weak" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

export function getOAuthRedirectUrl(next = "/"): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}
