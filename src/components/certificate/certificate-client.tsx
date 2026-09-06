"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Palette, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { courseTitleKey } from "@/lib/course-titles";
import { CERT_THEMES, sectionTheme } from "@/lib/certificate-themes";
import { certificateRef } from "@/lib/certificate-refs";
import type { CompletedSection } from "@/lib/section-completion";
import { Link } from "@/i18n/navigation";
import { CertificateSvg } from "@/components/certificate/certificate-svg";
import { useCertificateDownload } from "@/components/certificate/use-certificate-download";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { Button } from "@/components/ui/button";

export interface CertificateCompletion {
  courseId: string;
  title: string;
  completedAt: string;
}

type Selection =
  | { kind: "course"; courseId: string }
  | { kind: "section"; sectionId: string };

const THEME_STORAGE_KEY = "rocourse:certificate:theme";

interface CertificateClientProps {
  name: string;
  completions: CertificateCompletion[];
  sections: CompletedSection[];
  handle: string | null;
  initialCourseId?: string | null;
  initialSectionId?: string | null;
}

function initialSelection(
  completions: CertificateCompletion[],
  sections: CompletedSection[],
  initialCourseId?: string | null,
  initialSectionId?: string | null
): Selection | null {
  if (
    initialSectionId &&
    sections.some((section) => section.sectionId === initialSectionId)
  ) {
    return { kind: "section", sectionId: initialSectionId };
  }
  if (
    initialCourseId &&
    completions.some((completion) => completion.courseId === initialCourseId)
  ) {
    return { kind: "course", courseId: initialCourseId };
  }
  if (completions[0]) return { kind: "course", courseId: completions[0].courseId };
  if (sections[0]) return { kind: "section", sectionId: sections[0].sectionId };
  return null;
}

export function CertificateClient({
  name,
  completions,
  sections,
  handle,
  initialCourseId,
  initialSectionId,
}: CertificateClientProps) {
  const t = useTranslations("certificate");
  const course = useTranslations("course");
  const [selection, setSelection] = React.useState<Selection | null>(() =>
    initialSelection(completions, sections, initialCourseId, initialSectionId)
  );
  const [themeId, setThemeId] = React.useState<string>(() => {
    if (typeof window === "undefined") return CERT_THEMES[0].id;
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved && CERT_THEMES.some((theme) => theme.id === saved)
      ? saved
      : CERT_THEMES[0].id;
  });
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // Storage may be unavailable (private mode) — the choice still applies.
    }
  }, [themeId]);

  const isCourse = selection?.kind === "course";
  const completion = isCourse
    ? completions.find((item) => item.courseId === selection.courseId) ??
      completions[0]
    : null;
  const section =
    selection?.kind === "section"
      ? sections.find((item) => item.sectionId === selection.sectionId) ??
        sections[0]
      : null;
  const theme = isCourse
    ? CERT_THEMES.find((item) => item.id === themeId) ?? CERT_THEMES[0]
    : section
      ? sectionTheme(section.sectionId)
      : CERT_THEMES[0];

  const scope =
    completion && isCourse
      ? ({ kind: "course" as const, courseId: completion.courseId })
      : section
        ? ({ kind: "section" as const, sectionId: section.sectionId })
        : null;
  const sharedRef = scope ? certificateRef(scope) : null;

  const title = completion
    ? course(courseTitleKey(completion.courseId))
    : section
      ? section.title
      : "";
  const completedAt = completion
    ? completion.completedAt
    : section
      ? section.completedAt
      : "";
  const completedAtDate = new Date(completedAt);
  const dateLabel = Number.isNaN(completedAtDate.getTime())
    ? ""
    : t("completedOn", {
        date: completedAtDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });

  const downloadName = sharedRef
    ? `RoCourse-Certificate-${sharedRef.replace("section-", "section-of-")}.png`
    : "RoCourse-Certificate.png";
  const { downloading, handleDownload } = useCertificateDownload(
    svgRef,
    downloadName
  );

  if (!scope) return null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>

      {(completions.length > 0 || sections.length > 0) && (
        <div className="mt-6 space-y-4">
          {completions.length > 0 && (
            <div>
              <div className="text-sm font-medium">{t("course")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {completions.map((item) => (
                  <button
                    key={item.courseId}
                    type="button"
                    onClick={() =>
                      setSelection({ kind: "course", courseId: item.courseId })
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      isCourse && item.courseId === selection.courseId
                        ? "border-primary/50 bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {course(courseTitleKey(item.courseId))}
                  </button>
                ))}
              </div>
            </div>
          )}
          {sections.length > 0 && (
            <div>
              <div className="text-sm font-medium">{t("sections")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sections.map((item) => (
                  <button
                    key={item.sectionId}
                    type="button"
                    onClick={() =>
                      setSelection({
                        kind: "section",
                        sectionId: item.sectionId,
                      })
                    }
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                      selection?.kind === "section" &&
                        item.sectionId === selection.sectionId
                        ? "border-primary/50 bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isCourse && (
        <div className="mt-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Palette className="h-4 w-4 text-primary" />
            {t("background")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CERT_THEMES.map((item) => {
              const active = item.id === themeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setThemeId(item.id)}
                  aria-label={t(`themes.${item.id}`)}
                  aria-pressed={active}
                  title={t(`themes.${item.id}`)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                    active ? "border-primary/60 bg-primary/5" : "hover:bg-accent/60"
                  )}
                >
                  <span
                    className="h-8 w-8 rounded-md border border-black/10"
                    style={{ backgroundColor: item.bg }}
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      active ? "font-medium text-primary" : "text-muted-foreground"
                    )}
                  >
                    {t(`themes.${item.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          {t("downloadPng")}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          {t("savePdf")}
        </Button>
        {handle && sharedRef ? (
          <>
            <ShareLinkButton
              path={`/certificate/${handle}/${sharedRef}`}
              labelKey="shareCertificate"
              variant="outline"
            />
            <Link
              href={`/certificate/${handle}/${sharedRef}`}
              className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("viewSharedPage")}
            </Link>
          </>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("dpiNote")}</p>
    </div>
  );
}