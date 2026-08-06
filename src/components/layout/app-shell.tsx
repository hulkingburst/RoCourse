"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarNav } from "@/components/layout/course-sidebar";
import type { CourseSection, SearchEntry } from "@/lib/types";

export function AppShell({
  children,
  sections,
  searchEntries,
}: {
  children: React.ReactNode;
  sections: CourseSection[];
  searchEntries: SearchEntry[];
}) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <div className="min-h-screen">
      {!sidebarCollapsed && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-80 border-r bg-sidebar text-sidebar-foreground lg:block">
          <SidebarNav sections={sections} />
        </aside>
      )}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-0" : "lg:pl-80"
        )}
      >
        <SiteHeader sections={sections} searchEntries={searchEntries} />
        <main className="flex-1">{children}</main>
        <footer className="border-t py-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
            <p>
              {process.env.NEXT_PUBLIC_COURSE_NAME ?? "RoCourse"} — a
              hands-on course for building your first Roblox games.
            </p>
            <p className="font-mono">Learn by building, not by copying.</p>
            <a
              href="https://throne.com/hulkingburst"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Donate to support RoCourse"
              className="flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Heart className="h-3 w-3" />
              Donate
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
