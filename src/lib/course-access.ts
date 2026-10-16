import type { CourseSection } from "@/lib/types";

/**
 * Which lessons a learner may open regardless of progress.
 *
 * The main course unlocks one lesson at a time: read the one before it, then
 * the next opens. Optional sections (everything after the final project) are
 * the exception — each one's opening lesson is a free entry point, so someone
 * who already knows the basics can start with the anti-cheat or studio lessons
 * on their first visit and work forward from there.
 *
 * Client-safe and dependency-free: the store, the sidebar and the lesson list
 * all need the same answer, and deriving it in one place is what keeps them
 * from disagreeing about which lessons are open.
 */

type SectionLike = Pick<CourseSection, "optional" | "lessons">;

/** Slugs of the first lesson of every optional section. */
export function optionalStartSlugs(
  sections: readonly SectionLike[]
): Set<string> {
  const slugs = new Set<string>();
  for (const section of sections) {
    if (!section.optional) continue;
    const first = section.lessons[0];
    if (first) slugs.add(first.slug);
  }
  return slugs;
}

/** True when `slug` is the opening lesson of an optional section. */
export function isOptionalStart(
  sections: readonly SectionLike[],
  slug: string
): boolean {
  return optionalStartSlugs(sections).has(slug);
}

/** True when `slug` may be opened with no progress at all. */
export function isOpenFromStart(
  sections: readonly SectionLike[],
  slug: string
): boolean {
  const first = sections[0]?.lessons[0];
  return first?.slug === slug || isOptionalStart(sections, slug);
}
