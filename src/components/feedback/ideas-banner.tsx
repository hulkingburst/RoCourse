"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeedbackUiStore } from "@/lib/feedback-ui";

const STORAGE_KEY = "rocourse:ideas-banner-dismissed";
const CHANGE_EVENT = "rocourse:ideas-banner-changed";

// Dismissal is a browser preference, so the server cannot know it. Reading it
// through useSyncExternalStore renders nothing on the server and on the first
// hydration pass, then shows the banner only if this browser has not closed it,
// which keeps the markup consistent.
function subscribeToDismissal(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getDismissedSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Storage can be blocked; a banner that cannot record its dismissal would
    // reappear on every page, so treat it as dismissed instead.
    return true;
  }
}

function getServerDismissedSnapshot() {
  return true;
}

/**
 * A slim, dismissible strip at the top of the content column that asks for
 * feature ideas. It opens the shared feedback dialog with "Feature request"
 * already selected; it never covers content and can be closed for good.
 */
export function IdeasBanner() {
  const t = useTranslations("ideasBanner");
  const openDialog = useFeedbackUiStore((state) => state.openDialog);
  const dismissed = React.useSyncExternalStore(
    subscribeToDismissal,
    getDismissedSnapshot,
    getServerDismissedSnapshot
  );

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to persist; the event below still hides it for this page.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <div className="border-b bg-primary/5">
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <Lightbulb className="mt-0.5 hidden h-4 w-4 shrink-0 text-primary sm:mt-0 sm:block" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{t("title")}</p>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={() => openDialog("feature")}>
            {t("cta")}
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t("dismiss")}
            className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
