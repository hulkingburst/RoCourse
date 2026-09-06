"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Printer } from "lucide-react";
import { CERT_THEMES, sectionTheme } from "@/lib/certificate-themes";
import { Link } from "@/i18n/navigation";
import { CertificateSvg } from "@/components/certificate/certificate-svg";
import { useCertificateDownload } from "@/components/certificate/use-certificate-download";
import { Button } from "@/components/ui/button";

interface CertificateSharedProps {
  handle: string;
  refCode: string;
  name: string;
  /** Display title: section title (English) or localized course name. */
  title: string;
  completedAt: string;
  isSection: boolean;
  sectionId?: string;
}

/**
 * Public view of someone's certificate. Guests can see, download, and print it
 * without signing in; the paper is deterministic (course = default theme,
 * section = that section's fixed theme) so the shared link looks identical to
 * whoever opens it.
 */
export function CertificateShared({
  handle,
  refCode,
  name,
  title,
  completedAt,
  isSection,
  sectionId,
}: CertificateSharedProps) {
  const t = useTranslations("certificateShare");
  const cert = useTranslations("certificate");
  const svgRef = React.useRef<SVGSVGElement>(null);

  const theme = isSection && sectionId ? sectionTheme(sectionId) : CERT_THEMES[0];

  const completedAtDate = new Date(completedAt);
  const dateLabel = Number.isNaN(completedAtDate.getTime())
    ? ""
    : cert("completedOn", {
        date: completedAtDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });

  const { downloading, handleDownload } = useCertificateDownload(
    svgRef,
    `RoCourse-Certificate-${refCode.replace("section-", "section-of-")}.png`
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("heading")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro", { name })}</p>

      <div className="mt-6 rounded-xl border bg-muted/30 p-3">
        <CertificateSvg
          svgRef={svgRef}
          id="certificate-print"
          theme={theme}
          name={name}
          courseTitle={title}
          dateLabel={dateLabel}
          className="h-auto w-full"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {cert("downloadPng")}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {cert("savePdf")}
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{cert("dpiNote")}</p>

      <div className="mt-8 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/u/${handle}`}
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t("viewProfile", { name })}
        </Link>
        <Link
          href="/lessons"
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t("startLearning")}
        </Link>
      </div>
    </div>
  );
}