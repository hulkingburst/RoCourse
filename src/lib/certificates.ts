import { prisma } from "@/lib/prisma";
import { getCourseStructure } from "@/lib/lessons";
import { moderateName } from "@/lib/profanity";
import type { ProgressSnapshot } from "@/lib/sync-types";
import {
  collectCompletedSections,
  type CompletedSection,
} from "@/lib/section-completion";
import {
  parseCertificateRef,
  type CertificateScope,
} from "@/lib/certificate-refs";

/** Completed sections for a user's progress blob, derived from current content. */
export function getCompletedSectionCertificates(
  progress: ProgressSnapshot | null
): CompletedSection[] {
  const sections = getCourseStructure().map((section) => ({
    id: section.id,
    title: section.title,
    slugs: section.lessons.map((lesson) => lesson.slug),
  }));
  return collectCompletedSections(sections, progress?.lessons ?? null);
}

/** A certificate someone can point a friend at. Serialized for public pages. */
export interface ShareableCertificate {
  handle: string;
  name: string;
  scope: CertificateScope;
  /** Display title of the thing completed (English section title or stored
   * course title — callers localize course titles via courseTitleKey). */
  title: string | null;
  completedAt: string;
}

/**
 * Resolves a public certificate for any viewer (no session required). Returns
 * null for unknown handles, malformed refs, unknown sections, or anything the
 * target user hasn't actually completed — so forged links 404.
 */
export async function getShareableCertificate(
  handle: string,
  ref: string
): Promise<ShareableCertificate | null> {
  const scope = parseCertificateRef(ref);
  if (!scope) return null;

  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      name: true,
      progress: { select: { data: true } },
    },
  });
  if (!user) return null;

  if (scope.kind === "course") {
    const completion = await prisma.courseCompletion.findUnique({
      where: {
        userId_courseId: { userId: user.id, courseId: scope.courseId },
      },
    });
    if (!completion) return null;
    return {
      handle,
      name: moderateName(user.name),
      scope,
      title: completion.title,
      completedAt: completion.completedAt.toISOString(),
    };
  }

  const section = getCourseStructure().find(
    (entry) => entry.id === scope.sectionId
  );
  if (!section || section.lessons.length === 0) return null;

  const progress = user.progress?.data as unknown as ProgressSnapshot | null;
  const completedAt = collectCompletedSections(
    [
      {
        id: section.id,
        title: section.title,
        slugs: section.lessons.map((lesson) => lesson.slug),
      },
    ],
    progress?.lessons ?? null
  )[0]?.completedAt;
  if (!completedAt) return null;

  return {
    handle,
    name: moderateName(user.name),
    scope,
    title: section.title,
    completedAt,
  };
}