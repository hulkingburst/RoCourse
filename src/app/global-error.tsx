"use client";

import * as React from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { CheckCircle2, Loader2, MessageSquareText, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// global-error replaces the root layout, so the layout's stylesheet import is
// bypassed — bring it in here or the error page renders unstyled.
import "./globals.css";

/**
 * Global error boundary. Renders in place of the whole app whenever the root
 * layout or a server render fails, so it must own its <html>/<body> and can't
 * rely on any of the app's providers (i18n, session, theme). Keep it lean.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Mirror the app's theme so this page doesn't flash light-mode over a dark
  // site. next-themes normally handles this on the real <html>; here we do it
  // directly on the DOM (before paint), since the boundary replaced that element.
  React.useLayoutEffect(() => {
    let theme: string | null = null;
    try {
      theme = localStorage.getItem("theme");
    } catch {
      // ignore storage access errors
    }
    const prefersDark =
      !theme &&
      typeof window.matchMedia !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", theme === "dark" || prefersDark);
  }, []);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="flex min-h-full items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <MessageSquareText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This page hit an unexpected error. If it keeps happening, let us know what you were
              doing and we&apos;ll take a look.
            </p>
            {error.digest ? (
              <p className="mt-3 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => reset()}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <FeedbackDialog />
          </div>
        </div>
      </body>
    </html>
  );
}

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "improvement", label: "Improvement" },
  { value: "other", label: "Other" },
];

type FeedbackType = (typeof FEEDBACK_TYPES)[number]["value"];
type Status = "idle" | "submitting" | "success" | "error";

/** Same dialog + submission flow as the site's footer feedback button. */
function FeedbackDialog() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [type, setType] = React.useState<FeedbackType>("bug");
  const [status, setStatus] = React.useState<Status>("idle");

  const reset = () => {
    setText("");
    setType("bug");
    setStatus("idle");
  };

  const submit = async () => {
    if (text.trim().length === 0 || status === "submitting") return;
    setStatus("submitting");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          type,
          page: window.location.pathname,
        }),
      });
      setStatus(response.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const disabled = text.trim().length === 0 || status === "submitting";

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MessageSquareText className="h-4 w-4" />
        Send feedback
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Tell us what happened. We read every report.
            </DialogDescription>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">Thanks for the feedback!</p>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Type</span>
                <SelectField
                  value={type}
                  onValueChange={(value) => setType(value as FeedbackType)}
                  options={FEEDBACK_TYPES}
                />
              </label>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                rows={5}
                required
                placeholder="What went wrong? What were you doing when it happened?"
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              {status === "error" && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  Couldn&apos;t send that. Please try again.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={status === "submitting"}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={disabled}>
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}