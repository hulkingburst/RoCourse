"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Copy, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ReferenceCategory, ReferenceEntry } from "@/lib/reference";

export function ReferenceClient({
  entries,
  categories,
}: {
  entries: ReferenceEntry[];
  categories: readonly ReferenceCategory[];
}) {
  const t = useTranslations("reference");
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [category, setCategory] = React.useState<ReferenceCategory | "All">("All");

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(timeout);
  }, [query]);

  const results = React.useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "All" && entry.category !== category) return false;
      if (!term) return true;
      const haystack = [
        t(`entries.${entry.id}.title`),
        t(`entries.${entry.id}.description`),
        t(`categories.${entry.category}`),
        entry.code,
        ...(entry.links ?? []).map((link) => t(link.labelKey)),
      ]
        .join("\n")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [entries, debounced, category, t]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["All", ...categories] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {cat === "All" ? t("all") : t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {t("noResults", { query, category })}
          </p>
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry }: { entry: ReferenceEntry }) {
  const t = useTranslations("reference");
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing to do.
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {t(`entries.${entry.id}.title`)}
            </CardTitle>
            <CardDescription className="mt-1 text-[13px]">
              {t(`entries.${entry.id}.description`)}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 px-2 py-0 text-[10px]"
          >
            {t(`categories.${entry.category}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-2">
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[12.5px] leading-relaxed">
            <code>{entry.code}</code>
          </pre>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={copy}
            aria-label={t("copyCode")}
            className="absolute right-1.5 top-1.5 h-7 w-7"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        {entry.links && entry.links.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {entry.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t(link.labelKey)}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
