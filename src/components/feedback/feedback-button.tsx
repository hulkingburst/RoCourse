"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedbackUiStore, type FeedbackType } from "@/lib/feedback-ui";

export function FeedbackButton({
  className,
  variant = "inline",
  initialType = "bug",
}: {
  className?: string;
  variant?: "inline" | "floating";
  initialType?: FeedbackType;
}) {
  const t = useTranslations("feedback");
  const openDialog = useFeedbackUiStore((state) => state.openDialog);

  return (
    <button
      type="button"
      onClick={() => openDialog(initialType)}
      // The floating variant is a round icon on phones — the labelled pill
      // only appears once there is room for it.
      aria-label={variant === "floating" ? t("button") : undefined}
      className={cn(
        variant === "floating"
          ? "flex h-11 w-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.04] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-ring/50 active:scale-95 sm:w-auto sm:px-4"
          : "flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        className
      )}
    >
      <MessageSquareText className={variant === "floating" ? "h-4 w-4" : "h-3 w-3"} />
      <span className={variant === "floating" ? "hidden sm:inline" : undefined}>
        {t("button")}
      </span>
    </button>
  );
}
