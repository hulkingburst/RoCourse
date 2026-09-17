"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Download, Languages, Loader2, Palette, PenLine, Sparkles, Upload, UserCircle2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { ThemePicker } from "@/components/settings/theme-picker";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applyImportedProgress,
  buildProgressExport,
  parseProgressImport,
  progressExportFilename,
} from "@/lib/export";
import { changeUsername, type ChangeUsernameResult } from "@/lib/account-actions";
import type { UsernameChangeInfo } from "@/lib/account";
import { waitForHydration } from "@/lib/sync";

/**
 * Downloads the current progress backup. Waits for the progress store to
 * rehydrate from localStorage first so a freshly-opened settings page can never
 * export a partial/empty file while loading.
 */
async function downloadProgressExport() {
  await waitForHydration();
  const payload = buildProgressExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = progressExportFilename();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function usernameErrorLabel(
  t: ReturnType<typeof useTranslations<"settings">>,
  result: NonNullable<ChangeUsernameResult>
): string {
  if (result.error === "cooldown" && result.nextChangeAt) {
    return t("usernameErrorCooldown", { date: formatDate(result.nextChangeAt) });
  }
  const suffix = result.error
    ? `${result.error.charAt(0).toUpperCase()}${result.error.slice(1)}`
    : "";
  return t(`usernameError${suffix}`);
}

export function SettingsClient({ account }: { account: UsernameChangeInfo | null }) {
  const t = useTranslations("settings");
  const lang = useTranslations("language");
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = React.useState<"idle" | "ok" | "error">("idle");
  const [editingUsername, setEditingUsername] = React.useState(false);
  const [usernameSubmitting, setUsernameSubmitting] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = React.useState(false);

  const handleImportFile = React.useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const raw = typeof reader.result === "string" ? reader.result : "";
        const result = parseProgressImport(raw);
        if (!result.ok) {
          setImportStatus("error");
          return;
        }
        if (window.confirm(t("dataImportConfirm"))) {
          await waitForHydration();
          applyImportedProgress(result.progress);
          setImportStatus("ok");
        } else {
          setImportStatus("idle");
        }
      };
      reader.onerror = () => setImportStatus("error");
      reader.readAsText(file);
    },
    [t]
  );

  const handleUsernameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUsernameError(null);
    setUsernameSaved(false);
    setUsernameSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await changeUsername(formData);
    if (result.error) {
      setUsernameError(usernameErrorLabel(t, result));
      setUsernameSubmitting(false);
      return;
    }
    setUsernameSubmitting(false);
    setEditingUsername(false);
    setUsernameSaved(true);
    await update();
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {account ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-primary" />
              {t("accountTitle")}
            </CardTitle>
            <CardDescription>{t("accountHint")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {editingUsername ? (
              <form onSubmit={handleUsernameSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="username">{t("newUsernameLabel")}</Label>
                  <Input
                    id="username"
                    name="name"
                    required
                    autoFocus
                    maxLength={40}
                    defaultValue={account.name}
                  />
                </div>
                {usernameError ? (
                  <p className="text-sm text-destructive">{usernameError}</p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={usernameSubmitting}>
                    {usernameSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {t("usernameSave")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={usernameSubmitting}
                    onClick={() => {
                      setEditingUsername(false);
                      setUsernameError(null);
                    }}
                  >
                    {t("usernameCancel")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="block text-sm text-muted-foreground">
                    {t("usernameLabel")}
                  </span>
                  <span className="block font-semibold">{account.name}</span>
                  {!account.canChange && account.nextChangeAt ? (
                    <span className="block text-xs text-muted-foreground">
                      {t("usernameNextChange", { date: formatDate(account.nextChangeAt) })}
                    </span>
                  ) : null}
                  {usernameSaved ? (
                    <span className="block text-sm font-medium text-success">
                      {t("usernameChanged")}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!account.canChange}
                    onClick={() => setEditingUsername(true)}
                  >
                    <PenLine className="h-4 w-4" />
                    {t("changeUsernameButton")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t("appearanceTitle")}
          </CardTitle>
          <CardDescription>{t("appearanceHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{t("themeLabel")}</span>
          <ThemePicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            {lang("label")}
          </CardTitle>
          <CardDescription>{t("languageHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">{t("languageLabel")}</span>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t("dataTitle")}
          </CardTitle>
          <CardDescription>{t("dataHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">{t("dataDescription")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadProgressExport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              {t("dataExportButton")}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
            >
              <Upload className="h-4 w-4" />
              {t("dataImportButton")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleImportFile(file);
                event.target.value = "";
              }}
            />
          </div>
          {importStatus !== "idle" && (
            <p
              aria-live="polite"
              className={`text-sm font-medium ${importStatus === "ok" ? "text-success" : "text-destructive"}`}
            >
              {importStatus === "ok" ? t("dataImportSuccess") : t("dataImportError")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t("comingSoon")}</span>
      </div>
    </div>
  );
}