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

/** Swatches the learner can pick from for their *course* certificates. */
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

/**
 * Fixed, per-section palettes. Section certificates are deterministic — every
 * section always renders with the same paper so a shared link looks the same
 * to everyone, unlike the course certificates where the learner picks a theme.
 */
export const SECTION_THEMES: Record<string, CertificateTheme> = {
  "getting-started": {
    id: "getting-started",
    label: "First Steps",
    bg: "#F0FDF4",
    ink: "#14532D",
    muted: "#3F7D52",
    gold: "#15803D",
  },
  "luau-basics": {
    id: "luau-basics",
    label: "Luau",
    bg: "#EEF2FF",
    ink: "#312E81",
    muted: "#5B5B9E",
    gold: "#4F46E5",
  },
  data: {
    id: "data",
    label: "Data",
    bg: "#FFF7ED",
    ink: "#7C2D12",
    muted: "#9A6B4F",
    gold: "#EA580C",
  },
  gameplay: {
    id: "gameplay",
    label: "Gameplay",
    bg: "#FFF1F2",
    ink: "#881337",
    muted: "#9D4A60",
    gold: "#BE123C",
  },
  objects: {
    id: "objects",
    label: "World",
    bg: "#F0F9FF",
    ink: "#0C4A6E",
    muted: "#3E6C8A",
    gold: "#0284C7",
  },
  publishing: {
    id: "publishing",
    label: "Publishing",
    bg: "#FAF5FF",
    ink: "#581C87",
    muted: "#7A5793",
    gold: "#7C3AED",
  },
  "leveling-up": {
    id: "leveling-up",
    label: "Leveling Up",
    bg: "#FEFCE8",
    ink: "#713F12",
    muted: "#8A7543",
    gold: "#CA8A04",
  },
  "final-project": {
    id: "final-project",
    label: "Final Project",
    bg: "#FFFBEB",
    ink: "#78350F",
    muted: "#926A3F",
    gold: "#B45309",
  },
  "advanced-studio": {
    id: "advanced-studio",
    label: "Advanced Studio",
    bg: "#18181B",
    ink: "#F4F4F5",
    muted: "#A1A1AA",
    gold: "#D4AF37",
  },
};

export function sectionTheme(sectionId: string): CertificateTheme {
  return SECTION_THEMES[sectionId] ?? CERT_THEMES[0];
}