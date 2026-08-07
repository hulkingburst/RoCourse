"use client";

import * as React from "react";
import { Download, Loader2, Palette, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CertificateSvg,
  type CertificateTheme,
} from "@/components/certificate/certificate-svg";

export interface CertificateCompletion {
  courseId: string;
  title: string;
  completedAt: string;
}

export const CERT_THEMES: CertificateTheme[] = [
  {
    id: "cream",
    label: "Light",
    bg: "#FDFCF9",
    ink: "#1E3A5F",
    muted: "#5A6B82",
    gold: "#C9A227",
  },
  {
    id: "midnight",
    label: "Dark",
    bg: "#0F172A",
    ink: "#F8FAFC",
    muted: "#94A3B8",
    gold: "#D4AF37",
  },
  {
    id: "white",
    label: "White",
    bg: "#FFFFFF",
    ink: "#1E3A5F",
    muted: "#5A6B82",
    gold: "#C9A227",
  },
  {
    id: "ivory",
    label: "Ivory",
    bg: "#FFFBEB",
    ink: "#78350F",
    muted: "#926A3F",
    gold: "#B45309",
  },
  {
    id: "ocean",
    label: "Ocean",
    bg: "#EFF6FF",
    ink: "#1E3A5F",
    muted: "#64748B",
    gold: "#C9A227",
  },
  {
    id: "mint",
    label: "Mint",
    bg: "#ECFDF5",
    ink: "#064E3B",
    muted: "#27775C",
    gold: "#B08D2E",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    bg: "#18181B",
    ink: "#F4F4F5",
    muted: "#A1A1AA",
    gold: "#D4AF37",
  },
  {
    id: "slate",
    label: "Slate",
    bg: "#1E293B",
    ink: "#F1F5F9",
    muted: "#94A3B8",
    gold: "#E2B93B",
  },
];

const THEME_STORAGE_KEY = "rocourse:certificate:theme";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `Completed on ${date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })}`;
}

interface CertificateClientProps {
  name: string;
  completions: CertificateCompletion[];
  initialCourseId?: string | null;
}

export function CertificateClient({
  name,
  completions,
  initialCourseId,
}: CertificateClientProps) {
  const [courseId, setCourseId] = React.useState<string>(() => {
    if (
      initialCourseId &&
      completions.some((completion) => completion.courseId === initialCourseId)
    ) {
      return initialCourseId;
    }
    return completions[0]?.courseId ?? "";
  });
  const [themeId, setThemeId] = React.useState<string>(() => {
    if (typeof window === "undefined") return CERT_THEMES[0].id;
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved && CERT_THEMES.some((theme) => theme.id === saved)
      ? saved
      : CERT_THEMES[0].id;
  });
  const [downloading, setDownloading] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // Storage may be unavailable (private mode) — the choice still applies.
    }
  }, [themeId]);

  const completion =
    completions.find((item) => item.courseId === courseId) ?? completions[0];
  const theme = CERT_THEMES.find((item) => item.id === themeId) ?? CERT_THEMES[0];
  if (!completion) return null;

  const dateLabel = formatDate(completion.completedAt);

  const handleDownload = async () => {
    const node = svgRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      const xml = new XMLSerializer().serializeToString(node);
      const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render certificate"));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 3200;
      canvas.height = 2200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) throw new Error("Could not create PNG");

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(pngBlob);
      anchor.download = `RoCourse-Certificate-${completion.courseId}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(anchor.href), 10_000);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Your certificate</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        You earned this — pick a background that fits, then download it as a
        high-resolution PNG or save it as a PDF.
      </p>

      {completions.length > 1 && (
        <div className="mt-6">
          <div className="text-sm font-medium">Course</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {completions.map((item) => (
              <button
                key={item.courseId}
                type="button"
                onClick={() => setCourseId(item.courseId)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  item.courseId === courseId
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

      <div className="mt-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4 text-primary" />
          Background
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CERT_THEMES.map((item) => {
            const active = item.id === themeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setThemeId(item.id)}
                aria-label={item.label}
                aria-pressed={active}
                title={item.label}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                  active
                    ? "border-primary/60 bg-primary/5"
                    : "hover:bg-accent/60"
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
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-muted/30 p-3">
        <CertificateSvg
          svgRef={svgRef}
          id="certificate-print"
          theme={theme}
          name={name}
          courseTitle={completion.title}
          dateLabel={dateLabel}
          className="h-auto w-full"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PNG
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Save as PDF
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        The PNG downloads at 3200×2200 — print-ready at 300 DPI.
      </p>
    </div>
  );
}
