import type { Metadata } from "next";
import { getSearchIndex } from "@/lib/lessons";
import { SearchExperience } from "@/components/search/search-experience";

export const metadata: Metadata = {
  title: "Search Luau Lessons & Tutorials",
  description: "Search every Luau lesson and Roblox tutorial in the course.",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  const entries = getSearchIndex();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Search lessons</h1>
      <p className="mb-6 text-muted-foreground">
        Find lessons by title, description, tags, and keywords. Try{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-sm">
          RemoteEvents
        </code>{" "}
        or{" "}
        <code className="rounded bg-accent px-1.5 py-0.5 font-mono text-sm">
          leaderstats
        </code>
        .
      </p>
      <SearchExperience entries={entries} autoFocus />
    </div>
  );
}
