"use client";

import { useTranslations } from "next-intl";
import { Download, Languages, Palette, Sparkles } from "lucide-react";

import { ThemePicker } from "@/components/settings/theme-picker";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProgressExport, progressExportFilename } from "@/lib/export";

function downloadProgressExport() {
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

export function SettingsClient() {
  const t = useTranslations("settings");
  const lang = useTranslations("language");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

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
        <CardContent className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{t("dataDescription")}</span>
          <div>
            <button
              type="button"
              onClick={downloadProgressExport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              {t("dataExportButton")}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t("comingSoon")}</span>
      </div>
    </div>
  );
}
