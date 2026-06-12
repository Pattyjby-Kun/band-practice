"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Crown,
  History,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { copyToClipboard } from "@/lib/utils";
import type { BandActivityEntry } from "@/types/activity";
import type { Band, BandInvite, BandMemberProfile, BandRole } from "@/types/band";

interface EditBandModalProps {
  isOpen: boolean;
  bandId: string | null;
  accessToken: string;
  currentUserId: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onDeleted: (bandId: string) => Promise<void>;
  onLeft: (bandId: string) => Promise<void>;
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
}

function roleLabel(role: BandRole): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function roleBadgeVariant(role: BandRole): "default" | "secondary" | "outline" {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  return "outline";
}

export default function EditBandModal({
  isOpen,
  bandId,
  accessToken,
  currentUserId,
  onClose,
  onUpdated,
  onDeleted,
  onLeft,
}: EditBandModalProps) {
  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<BandMemberProfile[]>([]);
  const [invites, setInvites] = useState<BandInvite[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteMaxUses, setInviteMaxUses] = useState("0");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [activityItems, setActivityItems] = useState<BandActivityEntry[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);

  const canEditGeneral = band?.role === "owner" || band?.role === "admin";
  const canManageMembers =
    band?.role === "owner" || band?.role === "admin";
  const isOwner = band?.role === "owner";
  const canManageInvites = canManageMembers;

  const loadBandData = useCallback(async () => {
    if (!bandId) return;

    setLoading(true);
    setError("");

    try {
      const [bandRes, membersRes] = await Promise.all([
        fetch(`/api/bands/${bandId}`, {
          headers: authHeaders(accessToken),
        }),
        fetch(`/api/bands/${bandId}/members`, {
          headers: authHeaders(accessToken),
        }),
      ]);

      if (!bandRes.ok) {
        const data = await bandRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load band");
      }

      if (!membersRes.ok) {
        const data = await membersRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load members");
      }

      const bandData: Band = await bandRes.json();
      const membersData = await membersRes.json();

      setBand(bandData);
      setName(bandData.name);
      setMembers(membersData.members ?? []);

      if (bandData.role === "owner" || bandData.role === "admin") {
        const invitesRes = await fetch(`/api/bands/${bandId}/invites`, {
          headers: authHeaders(accessToken),
        });
        if (invitesRes.ok) {
          const invitesData = await invitesRes.json();
          setInvites(invitesData.invites ?? []);
        } else {
          setInvites([]);
        }
      } else {
        setInvites([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load band");
    } finally {
      setLoading(false);
    }
  }, [accessToken, bandId]);

  const loadActivity = useCallback(
    async (page = 1, append = false) => {
      if (!bandId) return;

      if (append) {
        setActivityLoadingMore(true);
      } else {
        setActivityLoading(true);
      }

      try {
        const res = await fetch(
          `/api/bands/${bandId}/activity?page=${page}&limit=20`,
          { headers: authHeaders(accessToken) }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load activity");
        }

        const data = await res.json();
        const items: BandActivityEntry[] = data.items ?? [];

        setActivityItems((prev) => (append ? [...prev, ...items] : items));
        setActivityPage(page);
        setActivityHasMore(Boolean(data.has_more));
      } catch (err) {
        if (!append) {
          setActivityItems([]);
        }
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setActivityLoading(false);
        setActivityLoadingMore(false);
      }
    },
    [accessToken, bandId]
  );

  useEffect(() => {
    if (isOpen && bandId && activeTab === "activity") {
      void loadActivity(1, false);
    }
  }, [isOpen, bandId, activeTab, loadActivity]);

  useEffect(() => {
    if (isOpen && bandId) {
      setDeleteConfirmName("");
      setActiveTab("general");
      setCopiedInviteId(null);
      setInviteMaxUses("0");
      setInviteExpiresAt("");
      void loadBandData();
    }
  }, [isOpen, bandId, loadBandData]);

  if (!isOpen || !bandId) return null;

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!bandId || !canEditGeneral) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/bands/${bandId}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update band");
      }

      const updated: Band = await res.json();
      setBand(updated);
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update band");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!bandId || !canManageMembers) return;
    if (!confirm("Remove this member from the band?")) return;

    setError("");
    try {
      const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove member");
      }

      await loadBandData();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleChangeRole(userId: string, role: BandRole) {
    if (!bandId || !isOwner) return;

    setError("");
    try {
      const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }

      await loadBandData();
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!bandId || !canManageInvites) return;

    setCreatingInvite(true);
    setError("");

    try {
      const parsedMaxUses = Number(inviteMaxUses);
      if (Number.isNaN(parsedMaxUses) || parsedMaxUses < 0) {
        throw new Error("Max uses must be 0 or greater");
      }

      const res = await fetch(`/api/bands/${bandId}/invites`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          max_uses: parsedMaxUses,
          expires_at: inviteExpiresAt
            ? new Date(inviteExpiresAt).toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create invite");
      }

      setInviteMaxUses("0");
      setInviteExpiresAt("");
      await loadBandData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleDisableInvite(inviteId: string) {
    if (!bandId || !canManageInvites) return;
    if (!confirm("Disable this invite code?")) return;

    setError("");
    try {
      const res = await fetch(`/api/bands/${bandId}/invites/${inviteId}`, {
        method: "PATCH",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ action: "disable" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disable invite");
      }

      await loadBandData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable invite");
    }
  }

  async function handleCopyInviteCode(invite: BandInvite) {
    const success = await copyToClipboard(invite.invite_code);
    if (success) {
      setCopiedInviteId(invite.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    }
  }

  async function handleDeleteBand() {
    if (!bandId || !band || !isOwner) return;
    if (deleteConfirmName.trim() !== band.name) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/bands/${bandId}`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ confirm_name: deleteConfirmName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete band");
      }

      onClose();
      await onDeleted(bandId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete band");
    } finally {
      setDeleting(false);
    }
  }

  function canRemoveMember(member: BandMemberProfile): boolean {
    if (!canManageMembers) return false;
    if (member.role === "owner") return false;
    if (member.user_id === currentUserId) return false;
    if (band?.role === "admin" && member.role === "admin") return false;
    return true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="glass-card relative flex max-h-[90vh] w-full max-w-2xl flex-col animate-slide-up rounded-2xl p-6">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Edit Band</h2>
            {band ? (
              <p className="mt-1 text-sm text-muted-foreground">{band.name}</p>
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

        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="w-full shrink-0 bg-muted/50">
              <TabsTrigger value="general" className="flex-1">
                General
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1">
                Members
              </TabsTrigger>
              {canManageInvites ? (
                <TabsTrigger value="invitations" className="flex-1">
                  Invitations
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="activity" className="flex-1">
                Activity
              </TabsTrigger>
              {isOwner ? (
                <TabsTrigger value="danger" className="flex-1">
                  Danger Zone
                </TabsTrigger>
              ) : null}
            </TabsList>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <TabsContent value="general" className="mt-0 space-y-4">
                <form onSubmit={handleSaveName} className="space-y-4">
                  <div>
                    <label
                      htmlFor="edit-band-name"
                      className="mb-1.5 block text-sm font-medium text-foreground/80"
                    >
                      Band Name
                    </label>
                    <input
                      id="edit-band-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canEditGeneral}
                      className="input-field disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  {canEditGeneral ? (
                    <button
                      type="submit"
                      disabled={saving || !name.trim()}
                      className="btn-primary"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only admins and owners can edit the band name.
                    </p>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="members" className="mt-0 space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members found.</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {member.display_name}
                          {member.user_id === currentUserId ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          ) : null}
                        </p>
                        <Badge
                          variant={roleBadgeVariant(member.role)}
                          className="mt-1"
                        >
                          {roleLabel(member.role)}
                        </Badge>
                      </div>

                      {isOwner && member.role !== "owner" ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {member.role === "member" ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeRole(member.user_id, "admin")
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-white hover:bg-muted/80"
                            >
                              <UserPlus className="h-3 w-3" />
                              Promote
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeRole(member.user_id, "member")
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-white hover:bg-muted/80"
                            >
                              <Shield className="h-3 w-3" />
                              Demote
                            </button>
                          )}
                          <button
                            type="button"
                            disabled
                            title="Coming soon"
                            className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg bg-muted/50 px-2 py-1 text-xs text-muted-foreground/60"
                          >
                            <Crown className="h-3 w-3" />
                            Transfer
                          </button>
                          {canRemoveMember(member) ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveMember(member.user_id)
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                            >
                              <UserMinus className="h-3 w-3" />
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ) : canRemoveMember(member) ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                        >
                          <UserMinus className="h-3 w-3" />
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))
                )}

                {isOwner ? (
                  <p className="text-xs text-muted-foreground">
                    Transfer ownership is coming in a future update.
                  </p>
                ) : null}
              </TabsContent>

              {canManageInvites ? (
                <TabsContent value="invitations" className="mt-0 space-y-4">
                  <form
                    onSubmit={handleCreateInvite}
                    className="space-y-3 rounded-xl border border-border p-4"
                  >
                    <p className="text-sm font-medium text-foreground">Create Invite</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="invite-max-uses"
                          className="mb-1 block text-xs text-muted-foreground"
                        >
                          Max Uses (0 = unlimited)
                        </label>
                        <input
                          id="invite-max-uses"
                          type="number"
                          min={0}
                          value={inviteMaxUses}
                          onChange={(e) => setInviteMaxUses(e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="invite-expires"
                          className="mb-1 block text-xs text-muted-foreground"
                        >
                          Expires At (optional)
                        </label>
                        <input
                          id="invite-expires"
                          type="datetime-local"
                          value={inviteExpiresAt}
                          onChange={(e) => setInviteExpiresAt(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={creatingInvite}
                      className="btn-primary"
                    >
                      {creatingInvite ? "Creating..." : "Create Invite"}
                    </button>
                  </form>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Active Invites
                    </p>
                    {invites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No active invite codes.
                      </p>
                    ) : (
                      invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="rounded-xl bg-muted/50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Invite Code
                              </p>
                              <code className="text-lg font-bold tracking-widest text-foreground">
                                {invite.invite_code}
                              </code>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyInviteCode(invite)}
                                className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-white hover:bg-muted/80"
                              >
                                {copiedInviteId === invite.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-green-400" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    Copy Code
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDisableInvite(invite.id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30"
                              >
                                Disable
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Uses: {invite.current_uses}
                            {invite.max_uses > 0
                              ? ` / ${invite.max_uses}`
                              : " (unlimited)"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              ) : null}

              <TabsContent value="activity" className="mt-0 space-y-3">
                {activityLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Loading activity...
                  </p>
                ) : activityItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <>
                    {activityItems.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl bg-muted/50 px-4 py-3"
                      >
                        <div className="flex items-start gap-2">
                          <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm text-white">{entry.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {activityHasMore ? (
                      <button
                        type="button"
                        onClick={() => void loadActivity(activityPage + 1, true)}
                        disabled={activityLoadingMore}
                        className="btn-secondary w-full"
                      >
                        {activityLoadingMore ? "Loading..." : "Load More"}
                      </button>
                    ) : null}
                  </>
                )}
              </TabsContent>

              {isOwner ? (
                <TabsContent value="danger" className="mt-0 space-y-4">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-red-300">
                      <Trash2 className="h-4 w-4" />
                      <h3 className="font-semibold">Delete Band</h3>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      This permanently deletes the band and all associated data.
                      Type the band name to confirm.
                    </p>
                    <label
                      htmlFor="delete-confirm-name"
                      className="mb-1.5 block text-sm text-foreground/80"
                    >
                      Type &quot;{band?.name}&quot; to confirm
                    </label>
                    <input
                      id="delete-confirm-name"
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      className="input-field mb-4"
                      placeholder={band?.name}
                    />
                    <button
                      type="button"
                      onClick={handleDeleteBand}
                      disabled={
                        deleting ||
                        deleteConfirmName.trim() !== (band?.name ?? "")
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-foreground hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deleting ? "Deleting..." : "Delete Band"}
                    </button>
                  </div>
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export async function leaveBandRequest(
  accessToken: string,
  bandId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`/api/bands/${bandId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to leave band");
  }
}
