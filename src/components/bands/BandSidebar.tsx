"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Guitar,
  Link2,
  LogOut,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { useBands } from "@/hooks/useBands";
import { useActiveBand } from "@/hooks/useActiveBand";
import { useAuth } from "@/components/AuthProvider";
import {
  createBandRequest,
  useBandContext,
} from "@/components/bands/BandProvider";
import CreateBandModal from "@/components/bands/CreateBandModal";
import EditBandModal, { leaveBandRequest } from "@/components/bands/EditBandModal";
import JoinBandModal from "@/components/bands/JoinBandModal";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Band, BandRole } from "@/types/band";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

function roleLabel(role: BandRole): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function roleBadgeClass(role: BandRole): string {
  if (role === "owner") return "bg-amber-500/20 text-amber-300";
  if (role === "admin") return "bg-sky-500/20 text-sky-300";
  return "bg-muted text-muted-foreground";
}

function canEditBand(role: BandRole): boolean {
  return role === "owner" || role === "admin";
}

function canLeaveBand(role: BandRole): boolean {
  return role === "admin" || role === "member";
}

interface BandContextMenuProps {
  band: Band;
  onEdit: () => void;
  onLeave: () => void;
}

function BandContextMenu({ band, onEdit, onLeave }: BandContextMenuProps) {
  const showEdit = canEditBand(band.role);
  const showLeave = canLeaveBand(band.role);

  if (!showEdit && !showLeave) {
    return null;
  }

  return (
    <ContextMenuContent className="w-48">
      {showEdit ? (
        <ContextMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          Edit Band
        </ContextMenuItem>
      ) : null}
      {showEdit && showLeave ? <ContextMenuSeparator /> : null}
      {showLeave ? (
        <ContextMenuItem variant="destructive" onClick={onLeave}>
          <LogOut className="h-4 w-4" />
          Leave Band
        </ContextMenuItem>
      ) : null}
    </ContextMenuContent>
  );
}

export default function BandSidebar() {
  const router = useRouter();
  const { session } = useAuth();
  const { bands, loading } = useBands();
  const { activeBandId, selectActiveBand, setActiveBandId } = useActiveBand();
  const { refreshBands } = useBandContext();
  const { isMobile, setOpenMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [editBandId, setEditBandId] = useState<string | null>(null);

  function handleSelectBand(bandId: string) {
    selectActiveBand(bandId);
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  function requireAuth(action: () => void) {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      return;
    }
    action();
  }

  async function handleCreateBand(name: string) {
    if (!session?.access_token) {
      router.push("/login?returnUrl=/");
      throw new Error("Sign in required");
    }

    const band = await createBandRequest(session.access_token, name);
    await refreshBands();
    selectActiveBand(band.id);
  }

  async function handleJoined(bandId: string) {
    await refreshBands();
    selectActiveBand(bandId);
  }

  async function handleLeaveBand(band: Band) {
    if (!session?.access_token || !session.user?.id) return;
    if (!canLeaveBand(band.role)) return;

    if (!confirm(`Leave "${band.name}"?`)) return;

    try {
      await leaveBandRequest(session.access_token, band.id, session.user.id);
      await refreshBands();
      if (activeBandId === band.id) {
        const remaining = bands.filter((item) => item.id !== band.id);
        const nextBandId = remaining[0]?.id;
        if (nextBandId) {
          selectActiveBand(nextBandId);
        } else {
          setActiveBandId(null);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to leave band");
    }
  }

  async function handleBandDeleted(bandId: string) {
    await refreshBands();
    if (activeBandId === bandId) {
      const remaining = bands.filter((item) => item.id !== bandId);
      const nextBandId = remaining[0]?.id;
      if (nextBandId) {
        selectActiveBand(nextBandId);
      } else {
        setActiveBandId(null);
      }
    }
  }

  async function handleBandLeft(bandId: string) {
    await refreshBands();
    if (activeBandId === bandId) {
      const remaining = bands.filter((item) => item.id !== bandId);
      const nextBandId = remaining[0]?.id;
      if (nextBandId) {
        selectActiveBand(nextBandId);
      } else {
        setActiveBandId(null);
      }
    }
  }

  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Guitar className="size-4" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Band Practice</p>
              <p className="truncate text-xs text-sidebar-foreground/60">
                Song Manager
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Your Bands</SidebarGroupLabel>
            <SidebarGroupContent>
              {loading ? (
                <p className="px-2 py-3 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
                  Loading bands...
                </p>
              ) : bands.length === 0 ? (
                <div className="px-2 py-3 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm text-sidebar-foreground/80">
                    Create your first band
                  </p>
                  <p className="mt-1 text-xs text-sidebar-foreground/50">
                    Or join an existing band with an invite code.
                  </p>
                </div>
              ) : (
                <SidebarMenu>
                  {bands.map((band) => {
                    const isActive = activeBandId === band.id;
                    const hasContextMenu =
                      canEditBand(band.role) || canLeaveBand(band.role);

                    const bandButton = (
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => handleSelectBand(band.id)}
                        tooltip={band.name}
                        className="items-start"
                      >
                        {isActive ? (
                          <Check className="mt-0.5 shrink-0 text-sidebar-primary" />
                        ) : (
                          <Users className="mt-0.5 shrink-0" />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate font-medium">{band.name}</span>
                          <span
                            className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide group-data-[collapsible=icon]:hidden ${roleBadgeClass(band.role)}`}
                          >
                            {roleLabel(band.role)}
                          </span>
                        </span>
                      </SidebarMenuButton>
                    );

                    return (
                      <SidebarMenuItem key={band.id}>
                        {hasContextMenu ? (
                          <ContextMenu>
                            <ContextMenuTrigger className="w-full">
                              {bandButton}
                            </ContextMenuTrigger>
                            <BandContextMenu
                              band={band}
                              onEdit={() =>
                                requireAuth(() => setEditBandId(band.id))
                              }
                              onLeave={() =>
                                requireAuth(() => void handleLeaveBand(band))
                              }
                            />
                          </ContextMenu>
                        ) : (
                          bandButton
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="space-y-2 border-t border-sidebar-border p-2">
          <Button
            variant="outline"
            className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
            onClick={() => requireAuth(() => setJoinOpen(true))}
          >
            <Link2 />
            <span className="group-data-[collapsible=icon]:hidden">Join Band</span>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
            onClick={() => requireAuth(() => setCreateOpen(true))}
          >
            <Plus />
            <span className="group-data-[collapsible=icon]:hidden">+ Create Band</span>
          </Button>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <CreateBandModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateBand}
      />

      {session?.access_token && session.user?.id ? (
        <>
          <JoinBandModal
            isOpen={joinOpen}
            accessToken={session.access_token}
            onClose={() => setJoinOpen(false)}
            onJoined={handleJoined}
          />
          <EditBandModal
            isOpen={Boolean(editBandId)}
            bandId={editBandId}
            accessToken={session.access_token}
            currentUserId={session.user.id}
            onClose={() => setEditBandId(null)}
            onUpdated={async () => {
              await refreshBands();
            }}
            onDeleted={handleBandDeleted}
            onLeft={handleBandLeft}
          />
        </>
      ) : null}
    </>
  );
}
