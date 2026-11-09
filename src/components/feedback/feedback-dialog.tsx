"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Bell, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuthUiStore } from "@/lib/auth-ui";
import { FEEDBACK_TYPES, useFeedbackUiStore, type FeedbackType } from "@/lib/feedback-ui";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * The app's only feedback form. It is mounted once by AppShell and opened
 * through `useFeedbackUiStore`, so a trigger elsewhere on the page (such as the
 * ideas banner) can open it with a type already selected instead of needing a
 * second copy of the dialog.
 */
export function FeedbackDialog() {
  const t = useTranslations("feedback");
  const { status: authStatus } = useSession();
  const openAuth = useAuthUiStore((state) => state.openDialog);
  const open = useFeedbackUiStore((state) => state.open);
  const initialType = useFeedbackUiStore((state) => state.type);
  const closeDialog = useFeedbackUiStore((state) => state.closeDialog);
  const [text, setText] = React.useState("");
  // null means "not changed yet", so the type the trigger selected shows until
  // the learner picks another one.
  const [chosenType, setChosenType] = React.useState<FeedbackType | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const type = chosenType ?? initialType;

  const reset = () => {
    setText("");
    setChosenType(null);
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeDialog();
          reset();
        }
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
            {authStatus !== "loading" ? (
              authStatus === "authenticated" ? (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("notifySignedIn")}
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t.rich("notifyGuest", {
                    signIn: (chunks) => (
                      <button
                        type="button"
                        onClick={() => openAuth("signin")}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {chunks}
                      </button>
                    ),
                  })}
                </p>
              )
            ) : null}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("type")}
              </span>
              <SelectField
                value={type}
                onValueChange={(option) => setChosenType(option as FeedbackType)}
                options={FEEDBACK_TYPES.map((value) => ({
                  value,
                  label: t(`type${value.charAt(0).toUpperCase()}${value.slice(1)}`),
                }))}
              />
            </label>
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
                onClick={() => {
                  closeDialog();
                  reset();
                }}
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
  );
}
