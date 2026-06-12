"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import BandSidebar from "@/components/bands/BandSidebar";
import { useActiveBand } from "@/hooks/useActiveBand";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { activeBand } = useActiveBand();

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <BandSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 h-4" />
            {activeBand ? (
              <span className="truncate text-sm text-muted-foreground">
                Active band:{" "}
                <span className="font-medium text-foreground">{activeBand.name}</span>
              </span>
            ) : null}
          </header>
          <div className="flex min-h-[calc(100svh-3rem)] flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
