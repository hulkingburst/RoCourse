"use client";

import { useTranslations } from "next-intl";
import { Palette, Sparkles } from "lucide-react";

import { ThemePicker } from "@/components/settings/theme-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsClient() {
  const t = useTranslations("settings");

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

      <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>{t("comingSoon")}</span>
      </div>
    </div>
  );
}
