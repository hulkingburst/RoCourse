"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { LessonMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PrevNext({
  prev,
  next,
}: {
  prev: LessonMeta | null;
  next: LessonMeta | null;
}) {
  return (
    <nav className="mt-10 grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/lessons/${prev.slug}`}
          className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
        >
          <ArrowLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Previous
            </div>
            <div className="truncate font-medium">{prev.title}</div>
          </div>
        </Link>
      ) : (
        <div className="hidden sm:block" />
      )}
      {next ? (
        <Link
          href={`/lessons/${next.slug}`}
          className="group flex items-start justify-end gap-3 rounded-xl border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-accent/50"
        >
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Next lesson
            </div>
            <div className="truncate font-medium">{next.title}</div>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <div className={cn("rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground")}>
          🎉 You&apos;ve reached the end of the course!
        </div>
      )}
    </nav>
  );
}
