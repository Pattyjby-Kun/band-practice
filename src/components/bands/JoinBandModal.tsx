"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface JoinBandModalProps {
  isOpen: boolean;
  accessToken: string;
  onClose: () => void;
  onJoined: (bandId: string) => Promise<void>;
}

export default function JoinBandModal({
  isOpen,
  accessToken,
  onClose,
  onJoined,
}: JoinBandModalProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInviteCode("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bands/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ invite_code: inviteCode.trim().toUpperCase() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to join band");
      }

      await onJoined(data.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join band");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="glass-card relative w-full max-w-md animate-slide-up rounded-2xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Join Band</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-code"
              className="mb-1.5 block text-sm font-medium text-foreground/80"
            >
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              className="input-field uppercase tracking-widest"
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Joining..." : "Join Band"}
          </button>
        </form>
      </div>
    </div>
  );
}
