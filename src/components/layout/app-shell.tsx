"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarNav } from "@/components/layout/course-sidebar";
import { useGuestXpReporter } from "@/lib/use-guest-xp-reporter";
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
  const pathname = usePathname();
  const t = useTranslations("footer");

  useGuestXpReporter();

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
        <main
          key={pathname}
          className="flex-1 animate-in fade-in duration-200 motion-reduce:animate-none"
        >
          {children}
        </main>
        <footer className="border-t py-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 px-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
            <p>{t("about", { courseName: process.env.NEXT_PUBLIC_COURSE_NAME ?? "RoCourse" })}</p>
            <p className="font-mono">{t("tagline")}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <Link
                href="/privacy"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("terms")}
              </Link>
              <Link
                href="/faq"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("faq")}
              </Link>
              <Link
                href="/guides"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("guides")}
              </Link>
              <Link
                href="/showcase"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("showcase")}
              </Link>
              <Link
                href="/leaderboard"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("leaderboard")}
              </Link>
              <Link
                href="/questions"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("questions")}
              </Link>
              <a
                href="https://throne.com/hulkingburst"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("donateAria")}
                className="flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <Heart className="h-3 w-3" />
                {t("donate")}
              </a>
            </div>
          </div>
        </footer>
      </div>
      <FeedbackButton variant="floating" />
    </div>
  );
}
