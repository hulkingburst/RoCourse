import type { Metadata } from "next";
import { countLessons, getCourseStructure } from "@/lib/lessons";
import { auth } from "@/lib/auth";
import { ensureHandle } from "@/lib/users";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your RoCourse progress, completions, and account details.",
  robots: { index: false, follow: true },
};

export default async function ProfilePage() {
  const session = await auth();
  const handle = session?.user?.id
    ? await ensureHandle(session.user.id)
    : null;

  const lessonMap = getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({ slug: lesson.slug, title: lesson.title }));

  return (
    <ProfileClient
      totalLessons={countLessons()}
      lessonMap={lessonMap}
      handle={handle}
    />
  );
}
