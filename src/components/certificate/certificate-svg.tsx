"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

export interface CertificateTheme {
  id: string;
  label: string;
  /** Certificate paper background. */
  bg: string;
  /** Primary text / outer frame color. */
  ink: string;
  /** Secondary text color. */
  muted: string;
  /** Accent (frame, title underline, course name). */
  gold: string;
}

interface CertificateSvgProps {
  theme: CertificateTheme;
  name: string;
  courseTitle: string;
  dateLabel: string;
  svgRef?: React.Ref<SVGSVGElement>;
  id?: string;
  className?: string;
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, 'Segoe UI', sans-serif";

/**
 * Vector certificate rendered inline so it can be downloaded as a high-res
 * PNG (serialized SVG → canvas) or printed straight to PDF. All colors come
 * from the selected theme, so the same layout works on light and dark paper.
 */
export function CertificateSvg({
  theme,
  name,
  courseTitle,
  dateLabel,
  svgRef,
  id,
  className,
}: CertificateSvgProps) {
  const t = useTranslations("certificate");
  return (
    <svg
      ref={svgRef}
      id={id}
      xmlns="http://www.w3.org/2000/svg"
      width={1600}
      height={1100}
      viewBox="0 0 1600 1100"
      className={className}
      role="img"
      aria-label={t("svg.aria", { name })}
    >
      <rect width="1600" height="1100" fill={theme.bg} />

      <rect x="40" y="40" width="1520" height="1020" rx="28" fill="none" stroke={theme.ink} strokeWidth="8" />
      <rect x="64" y="64" width="1472" height="972" rx="16" fill="none" stroke={theme.gold} strokeWidth="3" />

      <text x="800" y="160" textAnchor="middle" fontFamily={SERIF} fontSize="34" letterSpacing="8" fill={theme.gold}>
        ROCOURSE
      </text>
      <text x="800" y="196" textAnchor="middle" fontFamily={SANS} fontSize="16" letterSpacing="4" fill={theme.muted}>
        {t("svg.tagline")}
      </text>

      <text x="800" y="330" textAnchor="middle" fontFamily={SERIF} fontSize="76" fontWeight="bold" fill={theme.ink}>
        {t("svg.title")}
      </text>
      <text x="800" y="400" textAnchor="middle" fontFamily={SERIF} fontSize="44" fontStyle="italic" fill={theme.gold}>
        {t("svg.subtitle")}
      </text>

      <line x1="560" y1="452" x2="800" y2="452" stroke={theme.gold} strokeWidth="3" />
      <line x1="800" y1="452" x2="1040" y2="452" stroke={theme.gold} strokeWidth="3" />
      <rect x="790" y="442" width="20" height="20" fill={theme.gold} transform="rotate(45 800 452)" />

      <text x="800" y="540" textAnchor="middle" fontFamily={SANS} fontSize="26" fill={theme.muted}>
        {t("svg.certifies")}
      </text>
      <text x="800" y="630" textAnchor="middle" fontFamily={SERIF} fontSize="72" fontStyle="italic" fontWeight="bold" fill={theme.ink}>
        {name}
      </text>
      <text x="800" y="700" textAnchor="middle" fontFamily={SANS} fontSize="26" fill={theme.muted}>
        {t("svg.completed")}
      </text>
      <text x="800" y="770" textAnchor="middle" fontFamily={SERIF} fontSize="42" fontWeight="bold" fill={theme.gold}>
        {courseTitle}
      </text>
      <text x="800" y="830" textAnchor="middle" fontFamily={SANS} fontSize="20" fill={theme.muted}>
        {dateLabel}
      </text>

      <line x1="180" y1="930" x2="460" y2="930" stroke={theme.ink} strokeWidth="2" />
      <text x="320" y="960" textAnchor="middle" fontFamily={SANS} fontSize="16" fill={theme.muted}>
        {t("svg.team")}
      </text>

      <circle cx="1320" cy="895" r="62" fill="none" stroke={theme.gold} strokeWidth="5" />
      <circle cx="1320" cy="895" r="52" fill={theme.bg} stroke={theme.ink} strokeWidth="2" />
      <text x="1320" y="920" textAnchor="middle" fontFamily={SERIF} fontSize="52" fontWeight="bold" fill={theme.ink}>
        R
      </text>
    </svg>
  );
}
