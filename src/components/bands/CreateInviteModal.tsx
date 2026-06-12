"use client";

import { useEffect, useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import type { BandInvite } from "@/types/band";

interface CreateInviteModalProps {
  isOpen: boolean;
  bandId: string | null;
  bandName?: string;
  accessToken: string;
  onClose: () => void;
}

export default function CreateInviteModal({
  isOpen,
  bandId,
  bandName,
  accessToken,
  onClose,
}: CreateInviteModalProps) {
  const [maxUses, setMaxUses] = useState("0");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<BandInvite | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMaxUses("0");
      setExpiresAt("");
      setError("");
      setLoading(false);
      setCreatedInvite(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || !bandId) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const parsedMaxUses = Number(maxUses);
      if (Number.isNaN(parsedMaxUses) || parsedMaxUses < 0) {
        throw new Error("Max uses must be 0 or greater");
      }

      const res = await fetch(`/api/bands/${bandId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          max_uses: parsedMaxUses,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invite");
      }

      setCreatedInvite(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!createdInvite) return;
    const success = await copyToClipboard(createdInvite.invite_code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create Invite</h2>
            {bandName ? (
              <p className="mt-1 text-sm text-muted-foreground">{bandName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {createdInvite ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this invite code with band members:
            </p>
            <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-4">
              <code className="flex-1 text-center text-2xl font-bold tracking-widest text-foreground">
                {createdInvite.invite_code}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Copy invite code"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-400" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Uses: {createdInvite.current_uses}
              {createdInvite.max_uses > 0
                ? ` / ${createdInvite.max_uses}`
                : " (unlimited)"}
            </p>
            <button type="button" onClick={onClose} className="btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="max-uses"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Max Uses
              </label>
              <input
                id="max-uses"
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="input-field"
              />
              <p className="mt-1 text-xs text-muted-foreground">0 = unlimited uses</p>
            </div>

            <div>
              <label
                htmlFor="expires-at"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Expires At (optional)
              </label>
              <input
                id="expires-at"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input-field"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating..." : "Generate Invite Code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
