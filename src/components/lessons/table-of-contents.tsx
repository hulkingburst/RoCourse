"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Heading } from "@/lib/types";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (headings.length === 0) return;
    const visible = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry);
          else visible.delete(entry.target.id);
        }
        const sorted = [...visible.values()].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        const current = sorted[0];
        if (current) setActiveId(current.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-20">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              style={{ paddingLeft: `${(heading.level - 2) * 12 + 16}px` }}
              className={cn(
                "block border-l-2 border-transparent py-1 text-[13px] leading-snug transition-colors hover:text-foreground",
                activeId === heading.id
                  ? "border-primary font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
