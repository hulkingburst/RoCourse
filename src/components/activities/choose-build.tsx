"use client";

import * as React from "react";
import { CheckCircle2, CircleDollarSign, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  markActivity,
  useStepper,
} from "@/components/activities/activity-context";
import { ActivityCard } from "@/components/activities/activity-shell";
import {
  useProgressStore,
  type FinishedPath,
} from "@/lib/progress-store";

interface BuildOption {
  path: FinishedPath;
  nameKey: "Tycoon" | "Collector";
  icon: typeof CircleDollarSign;
}

const BUILD_OPTIONS: BuildOption[] = [
  {
    path: "tycoon",
    nameKey: "Tycoon",
    icon: CircleDollarSign,
  },
  {
    path: "collector",
    nameKey: "Collector",
    icon: Sparkles,
  },
];

/**
 * First step of the final project: pick which game you'll build.
 *
 * Picking a path persists it in the progress store and marks the step solved,
 * which unlocks "Continue" for the rest of the lesson. The rest of the lesson
 * uses <Variant name="..."> to show only the content for the chosen game.
 */
export function ChooseBuild() {
  const t = useTranslations("activity");
  const finishedPath = useProgressStore((state) => state.finishedPath);
  const setFinishedPath = useProgressStore((state) => state.setFinishedPath);
  const { onResult } = useStepper();

  const choose = (path: FinishedPath) => {
    setFinishedPath(path);
    onResult(true);
  };

  return (
    <ActivityCard label={t("pickBuild")} icon={Sparkles} status="idle">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("pickBuildHint")}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {BUILD_OPTIONS.map((build) => {
          const Icon = build.icon;
          const selected = finishedPath === build.path;
          const name = t(`build${build.nameKey}Name`);
          const tagline = t(`build${build.nameKey}Tagline`);
          const description = t(`build${build.nameKey}Description`);
          return (
            <button
              key={build.path}
              type="button"
              onClick={() => choose(build.path)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary/60 bg-primary/5"
                  : "cursor-pointer border-muted hover:border-primary/40 hover:bg-accent"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{name}</span>
                  <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {tagline}
                  </span>
                </span>
                {selected && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                )}
              </span>
              <span className="text-[13px] leading-relaxed text-muted-foreground">
                {description}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {selected ? t("selected") : t("selectBuild")}
              </span>
            </button>
          );
        })}
      </div>
    </ActivityCard>
  );
}

markActivity(ChooseBuild);
