"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MessageSquareText, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "idle" | "submitting" | "success" | "error";

export function FeedbackButton({
  className,
  variant = "inline",
}: {
  className?: string;
  variant?: "inline" | "floating";
}) {
  const t = useTranslations("feedback");
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");

  const reset = () => {
    setText("");
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
          page: typeof window !== "undefined" ? window.location.pathname : "",
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
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={cn(
          variant === "floating"
            ? "flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.04] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-ring/50 active:scale-95"
            : "flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
          className
        )}
      >
        <MessageSquareText className={variant === "floating" ? "h-4 w-4" : "h-3 w-3"} />
        {t("button")}
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">{t("thanks")}</p>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                rows={5}
                required
                placeholder={t("placeholder")}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              {status === "error" && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {t("error")}
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
                  {t("cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={disabled}>
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("sending")}
                    </>
                  ) : (
                    t("send")
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
