/**
 * Stable, shareable pointers to a certificate. A ref is a URL-safe string that
 * encodes *what* was completed without embedding any progress data:
 *
 *   course-<courseId>   full course completion (stored CourseCompletion)
 *   section-<sectionId> one finished section (derived from the progress blob)
 *
 * The public route is /certificate/[handle]/[ref]. This module is pure and
 * client-safe so both server resolvers and client share buttons can use it.
 */

export type CertificateRef = `course-${string}` | `section-${string}`;

export type CertificateScope =
  | { kind: "course"; courseId: string }
  | { kind: "section"; sectionId: string };

export function courseRef(courseId: string): CertificateRef {
  return `course-${courseId}`;
}

export function sectionRef(sectionId: string): CertificateRef {
  return `section-${sectionId}`;
}

export function certificateRef(scope: CertificateScope): CertificateRef {
  return scope.kind === "course"
    ? courseRef(scope.courseId)
    : sectionRef(scope.sectionId);
}

export function parseCertificateRef(ref: string): CertificateScope | null {
  if (ref.startsWith("course-")) {
    const courseId = ref.slice("course-".length);
    if (courseId.length === 0 || !/^[a-zA-Z0-9-]+$/.test(courseId)) return null;
    return { kind: "course", courseId };
  }
  if (ref.startsWith("section-")) {
    const sectionId = ref.slice("section-".length);
    if (sectionId.length === 0 || !/^[a-zA-Z0-9-]+$/.test(sectionId)) return null;
    return { kind: "section", sectionId };
  }
  return null;
}