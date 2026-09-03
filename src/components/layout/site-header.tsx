"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Flame,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Zap,
} from "lucide-react";
import * as React from "react";
import { useProgressStore } from "@/lib/progress-store";
import { isStreakActive } from "@/lib/streak";
import { levelFromXp } from "@/lib/xp";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/lib/ui-store";
import type { CourseSection, SearchEntry } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SearchDialog } from "@/components/search/search-dialog";
import { SidebarNav } from "@/components/layout/course-sidebar";
import { AccountMenu } from "@/components/auth/account-menu";

export function SiteHeader({
  sections,
  searchEntries,
}: {
  sections: CourseSection[];
  searchEntries: SearchEntry[];
}) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const streak = useProgressStore((state) => state.streak);
  const lastStreakDate = useProgressStore((state) => state.lastStreakDate);
  const xp = useProgressStore((state) => state.xp);
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [previousPathname, setPreviousPathname] = React.useState(pathname);
  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setMobileMenuOpen(false);
  }
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const streakActive = isStreakActive(lastStreakDate);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-sm font-bold">
              {process.env.NEXT_PUBLIC_COURSE_NAME ?? "RoCourse"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t("courseNavigation")}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav sections={sections} />
          </div>
        </SheetContent>
      </Sheet>

      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-bold lg:hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
        <Image
          src="/rocourselogo.png"
          alt="RoCourse"
          width={150}
          height={25}
          className="h-auto w-[150px] object-contain"
          priority
        />
      </Link>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? t("showSidebar") : t("hideSidebar")}
      >
        {sidebarCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>

      <SearchDialog entries={searchEntries} />
      {mounted && (
        <Link
          href="/profile"
          aria-label={t("dayStreak")}
          className={cn(
            "hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent sm:inline-flex",
            streakActive ? "text-orange-500" : "text-muted-foreground"
          )}
        >
          <Flame className={cn("h-4 w-4", streakActive && "fill-current")} />
          {streak}
        </Link>
      )}
      {mounted && (
        <Link
          href="/profile"
          aria-label={t("level")}
          className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent sm:inline-flex text-amber-500"
        >
          <Zap className="h-4 w-4 fill-current" />
          {levelFromXp(xp)}
        </Link>
      )}
      <AccountMenu />
      <Link
        href="/settings"
        aria-label={t("settings")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </header>
  );
}
