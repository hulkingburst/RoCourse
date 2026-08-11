"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Search, SearchX } from "lucide-react";
import { createSearchFuse } from "@/lib/search";
import { DIFFICULTY_LABEL, type SearchEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useProgressStore } from "@/lib/progress-store";

function ResultRow({ entry }: { entry: SearchEntry }) {
  return (
    <Link
      href={`/lessons/${entry.slug}`}
      className="block rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/60"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{entry.title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <Badge variant="secondary" className="px-2 py-0 text-[10px]">
            {entry.sectionTitle}
          </Badge>
          <Badge variant="outline" className="px-2 py-0 text-[10px] text-muted-foreground">
            {DIFFICULTY_LABEL[entry.difficulty]}
          </Badge>
        </span>
      </div>
      <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
        {entry.description}
      </p>
    </Link>
  );
}

export function SearchExperience({
  entries,
  autoFocus = false,
}: {
  entries: SearchEntry[];
  autoFocus?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const hydrated = useProgressStore((state) => state.hydrated);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const recentlyViewed = useProgressStore((state) => state.recentlyViewed);

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(timeout);
  }, [query]);

  const fuse = React.useMemo(() => createSearchFuse(entries), [entries]);
  const results = React.useMemo(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return [];
    const scored = fuse.search(debounced.trim());
    return scored.map((result) => result.item);
  }, [debounced, fuse]);

  const bookmarkEntries = React.useMemo(
    () =>
      bookmarks
        .map((slug) => entries.find((entry) => entry.slug === slug))
        .filter((entry): entry is SearchEntry => entry != null),
    [bookmarks, entries]
  );
  const recentEntries = React.useMemo(
    () =>
      recentlyViewed
        .map((slug) => entries.find((entry) => entry.slug === slug))
        .filter((entry): entry is SearchEntry => entry != null)
        .slice(0, 5),
    [recentlyViewed, entries]
  );

  return (
    <div className="flex flex-col">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search lessons…  e.g. RemoteEvents"
          className="pl-9"
        />
      </div>

      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {query.trim() ? (
          results.length > 0 ? (
            <div className="space-y-1">
              {results.map((entry) => (
                <ResultRow key={entry.slug} entry={entry} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <SearchX className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No lessons match “{query}”.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Try “variables”, “RemoteEvents”, or “leaderstats”.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {bookmarkEntries.length > 0 && (
              <div>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Bookmarked
                </p>
                <div className="space-y-1">
                  {bookmarkEntries.map((entry) => (
                    <ResultRow key={entry.slug} entry={entry} />
                  ))}
                </div>
              </div>
            )}
            {recentEntries.length > 0 && (
              <div>
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Recently viewed
                </p>
                <div className="space-y-1">
                  {recentEntries.map((entry) => (
                    <ResultRow key={entry.slug} entry={entry} />
                  ))}
                </div>
              </div>
            )}
            {bookmarkEntries.length === 0 && recentEntries.length === 0 && (
              <div className="space-y-2 px-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Search finds lessons by title, description, tags, and keywords.
                </p>
                <Link
                  href="/lessons"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Browse all {hydrated ? entries.length : ""} lessons
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
