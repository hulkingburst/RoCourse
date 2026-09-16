import type { LucideIcon } from "lucide-react";
import { Bug, GraduationCap, HeartHandshake, MessageSquareCheck } from "lucide-react";

/**
 * Server-gathered numbers used to judge title eligibility. Every field comes
 * from trusted backend data (the cloud-synced progress blob or a count of the
 * user's own contribution rows) — never from the client.
 */
export interface TitleContext {
  lessonsCompleted: number;
  challengesSolved: number;
  /** Feedback tickets the user has opened (any state). */
  feedbackOpened: number;
  /** Answers the user has posted in the Q&A. */
  questionAnswers: number;
}

export interface TitleDefinition {
  id: string;
  icon: LucideIcon;
  /**
   * Pure eligibility check against server-gathered numbers. Display names and
   * blurbs live in the `title` i18n namespace (`title.<id>.name` / `.description`).
   */
  isUnlocked: (ctx: TitleContext) => boolean;
}

/**
 * The small catalogue of recognisable developer titles. Each title recognises
 * meaningful, lasting activity that is not already a badge milestone: a real
 * listening/contribution habit (feedback opened, Q&A answers) or a level of
 * bug-hunting beyond the silver badge's bar.
 */
export const TITLES: TitleDefinition[] = [
  {
    id: "learner",
    icon: GraduationCap,
    isUnlocked: (ctx) => ctx.lessonsCompleted >= 5,
  },
  {
    id: "bug-hunter",
    icon: Bug,
    isUnlocked: (ctx) => ctx.challengesSolved >= 10,
  },
  {
    id: "feedback-builder",
    icon: MessageSquareCheck,
    isUnlocked: (ctx) => ctx.feedbackOpened >= 3,
  },
  {
    id: "community-helper",
    icon: HeartHandshake,
    isUnlocked: (ctx) => ctx.questionAnswers >= 3,
  },
];

const TITLE_IDS = new Set(TITLES.map((title) => title.id));

/** Guards the compact id stored on the user row against unknown values. */
export function isValidTitle(id: unknown): id is string {
  return typeof id === "string" && TITLE_IDS.has(id);
}

/** Returns the definition for a stored id, or null when it was removed from
 * the catalogue (stale/unknown rows safely render as "no title"). */
export function getTitleById(id: string | null | undefined): TitleDefinition | null {
  if (!id) return null;
  return TITLES.find((title) => title.id === id) ?? null;
}

/** Ids of every title earned for a given context. */
export function unlockedTitleIds(ctx: TitleContext): string[] {
  return TITLES.filter((title) => title.isUnlocked(ctx)).map((title) => title.id);
}