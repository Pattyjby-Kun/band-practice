const isDev = process.env.NODE_ENV === "development";

export function isDevelopment(): boolean {
  return isDev;
}

type ErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function formatAppError(error: unknown): string {
  if (!error) return "Unknown error";

  if (typeof error === "string") return error;

  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const err = error as ErrorLike;
    const parts = [err.message, err.details, err.hint, err.code].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }

  return "Unknown error";
}

export function logVoteDebug(label: string, data: unknown): void {
  if (!isDev) return;
  console.log(`[votes] ${label}:`, JSON.stringify(data, null, 2));
}
