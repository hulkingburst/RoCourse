"use client";

import * as React from "react";
import { CheckCircle2, Loader2, MessageSquareText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "idle" | "submitting" | "success" | "error";

export function FeedbackButton({ className }: { className?: string }) {
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className={className}
      >
        <MessageSquareText className="h-3 w-3" />
        Feedback
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
              Found a bug, or have an idea for the course? Tell us — it goes
              straight to the course author.
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
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                rows={5}
                required
                placeholder="What would you improve?"
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              {status === "error" && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  Something went wrong. Please try again in a moment.
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
