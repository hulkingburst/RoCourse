import type { Metadata } from "next";
import { countLessons, getCourseStructure } from "@/lib/lessons";
import { auth } from "@/lib/auth";
import { getCloudState } from "@/lib/sync-api";
import { ensureHandle } from "@/lib/users";
import { getCompletedSectionCertificates } from "@/lib/certificates";
import { getUnlockedTitleIds } from "@/lib/title-data";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your RoCourse progress, completions, and account details.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/profile" },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <ProfileClient
        totalLessons={countLessons()}
        lessonMap={[]}
        handle={null}
        sectionCertificates={[]}
        unlockedTitles={[]}
      />
    );
  }

  const [state, handle, unlockedTitles] = await Promise.all([
    getCloudState(session.user.id),
    ensureHandle(session.user.id),
    getUnlockedTitleIds(session.user.id),
  ]);

  const lessonMap = getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({ slug: lesson.slug, title: lesson.title }));

  return (
    <ProfileClient
      totalLessons={countLessons()}
      lessonMap={lessonMap}
      handle={handle}
      sectionCertificates={getCompletedSectionCertificates(state.progress)}
      unlockedTitles={unlockedTitles}
    />
  );
}
