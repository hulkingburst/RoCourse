import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCourseStructure } from "@/lib/lessons";
import { LessonList } from "@/components/home/lesson-list";

export const metadata: Metadata = {
  title: "Luau Lessons & Roblox Scripting Tutorials",
  description:
    "Free Luau lessons and Roblox scripting tutorials, from your first script to publishing a complete game.",
  alternates: { canonical: "/lessons" },
};

export default async function LessonsPage() {
  const t = await getTranslations("lessons");
  const sections = getCourseStructure();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <div className="mt-10">
        <LessonList sections={sections} />
      </div>
    </div>
  );
}
