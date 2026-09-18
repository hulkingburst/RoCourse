import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BookOpen, Cpu, Gamepad2 } from "lucide-react";
import { courseTagline } from "@content/course";
import { getCourseStructure } from "@/lib/lessons";
import { getSiteStats } from "@/lib/site-stats";
import { CourseOverview } from "@/components/home/course-overview";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

// The stat cards read live counters from the database, so the page must render
// per request rather than being prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const courseJsonLd = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "RoCourse — Learn Luau & Roblox for Free",
  description:
    "A free, interactive course for learning Luau and Roblox game development from absolute zero — through hands-on lessons, real game code, and a complete final project. No paywall, no sign-up.",
  provider: {
    "@type": "Organization",
    name: "RoCourse",
    sameAs: SITE_URL,
  },
  isAccessibleForFree: true,
  inLanguage: "en",
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "Online",
    isAccessibleForFree: true,
  },
};

export default async function HomePage() {
  const [t, format, stats] = await Promise.all([
    getTranslations("home"),
    getFormatter(),
    getSiteStats(),
  ]);
  const sections = getCourseStructure();
  const allLessons = sections.flatMap((section) => section.lessons);
  const firstLesson = allLessons[0];

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <JsonLd data={courseJsonLd} />
      <section className="mb-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {t("heroTitleBefore")}
          <span className="text-primary"> {t("heroTitleAccent")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">{courseTagline}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {firstLesson && (
            <Button asChild size="lg">
              <Link href={`/lessons/${firstLesson.slug}`}>
                {t("startCourse")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" size="lg">
            <Link href="/lessons">{t("browseLessons")}</Link>
          </Button>
        </div>

        <dl className="mt-10 grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">
              {t("statsLessonsCompleted")}
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {format.number(stats.lessonsCompleted)}
            </dd>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">
              {t("statsXpEarned")}
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {format.number(stats.xpEarned)}
            </dd>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">
              {t("statsLearners")}
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {format.number(stats.learners)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-14 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <Cpu className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">{t("feature1Title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("feature1Body")}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <Gamepad2 className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">{t("feature2Title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("feature2Body")}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <BookOpen className="mb-3 h-6 w-6 text-primary" />
          <h3 className="font-semibold">{t("feature3Title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("feature3Body")}
          </p>
        </div>
      </section>

      <CourseOverview sections={sections} />
    </div>
  );
}
