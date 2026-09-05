"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/navigation";

const CLOSE_DELAY_MS = 150;

/**
 * A glossary term rendered inline in lesson prose. Hovering (desktop) or
 * clicking (touch/keyboard) opens a popover with the definition, optionally
 * linking to the lesson that teaches it. Styled to blend into the surrounding
 * text with a subtle dotted underline.
 */
export function GlossaryTerm({
  defId,
  lesson,
  children,
}: {
  defId: string;
  lesson?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("glossary");
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current !== undefined) {
      clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  React.useEffect(() => cancelClose, [cancelClose]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-glossary-term="true"
          className="inline-block cursor-help border-0 bg-transparent p-0 font-[inherit] text-[inherit] [text-align:inherit] underline decoration-dotted decoration-foreground/50 decoration-1 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary focus:outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onClick={() => setOpen((v) => !v)}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t(`defs.${defId}.title`)}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t(`defs.${defId}.body`)}
        </p>
        {lesson ? (
          <Link
            href={`/lessons/${lesson}`}
            className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("learnMore")}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
