import type { Metadata } from "next";
import { countLessons, getCourseStructure } from "@/lib/lessons";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Your RoCourse progress, completions, and account details.",
};

export default function ProfilePage() {
  const lessonMap = getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({ slug: lesson.slug, title: lesson.title }));

  return <ProfileClient totalLessons={countLessons()} lessonMap={lessonMap} />;
}
