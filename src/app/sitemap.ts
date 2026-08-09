import type { MetadataRoute } from "next";
import { getCourseStructure } from "@/lib/lessons";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lessonUrls: MetadataRoute.Sitemap = getCourseStructure()
    .flatMap((section) => section.lessons)
    .map((lesson) => ({
      url: `${SITE_URL}/lessons/${lesson.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [
    { url: SITE_URL, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${SITE_URL}/lessons`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${SITE_URL}/playground`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/reference`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/resources`, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${SITE_URL}/guides`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/guides/how-to-make-a-game-in-roblox`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/guides/roblox-scripting-for-beginners`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/guides/what-is-luau`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/guides/fix-common-luau-errors`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/guides/learn-roblox-scripting-in-a-week`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/quiz`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/quiz/daily`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/privacy`, priority: 0.2 },
    { url: `${SITE_URL}/terms`, priority: 0.2 },
    ...lessonUrls,
  ];
}
