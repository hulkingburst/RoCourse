import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSearchIndex } from "@/lib/lessons";
import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = {
  title: "Search Luau Lessons & Tutorials",
  description: "Search every Luau lesson and Roblox tutorial in the course.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default async function SearchPage() {
  const t = await getTranslations("search");
  const entries = getSearchIndex();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 text-muted-foreground">
        {t.rich("pageIntro", {
          code: (chunks) => (
            <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-sm">
              {chunks}
            </code>
          ),
        })}
      </p>
      <SearchExperience entries={entries} autoFocus />
    </div>
  );
}
