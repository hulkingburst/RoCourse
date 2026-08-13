"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Package,
  ShieldCheck,
  User,
} from "lucide-react";
import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";
import {
  RESOURCE_KINDS,
  type Resource,
  type ResourceKind,
} from "@/lib/resources-shared";
import { Badge } from "@/components/ui/badge";

function CodeViewer({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    highlightCode(code, language).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    );
  }
  return (
    <div
      className="overflow-x-auto rounded-lg bg-[#0d1117] p-4 text-[13.5px] leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const t = useTranslations("resources");
  const [open, setOpen] = React.useState(false);
  const downloadUrl = resource.fileUrl
    ? `${resource.fileUrl}?download=1`
    : null;
  const visitUrl = resource.url ?? null;

  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(`kinds.${resource.kind}`)}</Badge>
            {resource.author && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {resource.author}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug">
            {resource.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        </div>
        {visitUrl && (
          <a
            href={visitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            {t("visitWebsite")}
          </a>
        )}
        {downloadUrl && (
          <a
            href={downloadUrl}
            download
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            {t("download")}
          </a>
        )}
      </div>

      {resource.code && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t("viewCode")}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </button>
          {open && (
            <div className="mt-3">
              <CodeViewer code={resource.code} language={resource.codeLang} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ResourcesCatalog({ resources }: { resources: Resource[] }) {
  const t = useTranslations("resources");
  const [filter, setFilter] = React.useState<ResourceKind | "all">("all");

  const filtered =
    filter === "all"
      ? resources
      : resources.filter((resource) => resource.kind === filter);

  const counts = React.useMemo(() => {
    const map = new Map<ResourceKind | "all", number>([["all", resources.length]]);
    for (const resource of resources) {
      map.set(resource.kind, (map.get(resource.kind) ?? 0) + 1);
    }
    return map;
  }, [resources]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            filter === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          )}
        >
          {t("all")} ({counts.get("all") ?? 0})
        </button>
        {RESOURCE_KINDS.map((kind) => (
          <button
            key={kind.value}
            type="button"
            onClick={() => setFilter(kind.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              filter === kind.value
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            {t(`kinds.${kind.value}`)} ({counts.get(kind.value) ?? 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">{t("noResources")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {resources.length === 0
              ? t("noResourcesEmpty")
              : filter === "all"
                ? t("noResourcesFiltered")
                : t("noResourcesKind", { kind: t(`kinds.${filter}`) })}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((resource, index) => (
            <li key={index}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        {t("reviewNote")}
      </p>
    </div>
  );
}
