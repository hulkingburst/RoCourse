"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { CheckCircle2, Loader2, Plus, XCircle } from "lucide-react";
import { useAuthUiStore } from "@/lib/auth-ui";
import {
  MAX_GAME_DESCRIPTION,
  MAX_GAME_NAME,
  MAX_GAME_URL,
} from "@/lib/showcase-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "idle" | "submitting" | "success" | "error";

export function SubmitGameDialog({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("showcase");
  const { status: authStatus } = useSession();
  const openAuth = useAuthUiStore((state) => state.openDialog);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const reset = () => {
    setName("");
    setDescription("");
    setUrl("");
    setStatus("idle");
    setError(null);
  };

  const submit = async () => {
    if (status === "submitting") return;
    const trimmedUrl = url.trim();
    if (trimmedUrl.length > 0 && !/^https?:\/\//i.test(trimmedUrl)) {
      setError(t("errorUrl"));
      return;
    }
    setError(null);
    setStatus("submitting");
    try {
      const response = await fetch("/api/showcase/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          url: trimmedUrl,
        }),
      });
      if (response.ok) {
        setStatus("success");
        return;
      }
      let errorCode = "generic";
      try {
        errorCode = ((await response.json()) as { error?: string }).error ?? "generic";
      } catch {
        // fall through to the generic message
      }
      setError(
        errorCode === "rate-limit"
          ? t("errorRateLimit")
          : errorCode === "not-finished"
            ? t("errorNotFinished")
            : t("errorGeneric")
      );
      setStatus("error");
    } catch {
      setError(t("errorGeneric"));
      setStatus("error");
    }
  };

  const signedIn = authStatus === "authenticated";

  return (
    <>
      {open === undefined && (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("submitAction")}
        </Button>
      )}
      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("submitTitle")}</DialogTitle>
            <DialogDescription>{t("submitDescription")}</DialogDescription>
          </DialogHeader>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-medium">{t("thanksTitle")}</p>
              <p className="max-w-xs text-xs text-muted-foreground">{t("thanksBody")}</p>
            </div>
          ) : authStatus === "loading" ? null : !signedIn ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="max-w-xs text-sm text-muted-foreground">
                {t.rich("notSignedIn", {
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
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="showcase-name">{t("nameField")}</Label>
                <Input
                  id="showcase-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={MAX_GAME_NAME}
                  required
                  placeholder={t("namePlaceholder")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="showcase-description">{t("descriptionField")}</Label>
                <textarea
                  id="showcase-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={MAX_GAME_DESCRIPTION}
                  rows={4}
                  required
                  placeholder={t("descriptionPlaceholder")}
                  className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="showcase-url">{t("urlField")}</Label>
                <Input
                  id="showcase-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  maxLength={MAX_GAME_URL}
                  placeholder={t("urlPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("urlHint")}</p>
              </div>

              {status === "error" && error && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
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
                <Button type="submit" size="sm" disabled={status === "submitting"}>
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