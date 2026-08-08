"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Flame,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Terminal,
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { useProgressStore } from "@/lib/progress-store";
import { isStreakActive } from "@/lib/streak";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchDialog } from "@/components/search/search-dialog";
import { SidebarNav } from "@/components/layout/course-sidebar";
import { AccountMenu } from "@/components/auth/account-menu";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {mounted && resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const streakActive = isStreakActive(lastStreakDate);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle className="text-sm font-bold">
              {process.env.NEXT_PUBLIC_COURSE_NAME ?? "RoCourse"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Course navigation
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
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
          <Image
            src="/rocourse-icon.png"
            alt="RoCourse"
            width={28}
            height={28}
            className="h-full w-full object-contain"
          />
        </span>
        RoCourse
      </Link>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
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
          aria-label="Day streak"
          className={cn(
            "hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent sm:inline-flex",
            streakActive ? "text-orange-500" : "text-muted-foreground"
          )}
        >
          <Flame className={cn("h-4 w-4", streakActive && "fill-current")} />
          {streak}
        </Link>
      )}
      <Button variant="ghost" size="sm" asChild className="hidden gap-1.5 sm:inline-flex">
        <Link href="/quiz/daily">
          <CalendarDays className="h-4 w-4" />
          Daily
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild className="hidden gap-1.5 sm:inline-flex">
        <Link href="/quiz">
          <ListChecks className="h-4 w-4" />
          Quiz
        </Link>
      </Button>
      <Button variant="ghost" size="sm" asChild className="hidden gap-1.5 sm:inline-flex">
        <Link href="/playground">
          <Terminal className="h-4 w-4" />
          Playground
        </Link>
      </Button>
      <AccountMenu />
      <ThemeToggle />
    </header>
  );
}
