"use client";

import * as React from "react";
import { LessonContext } from "@/components/lessons/lesson-context";

/**
 * Wraps the whole lesson page so interactive MDX components (Quiz, Solution,
 * Prediction) and lesson chrome can read the current lesson slug.
 */
export function LessonProvider({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ slug, title }), [slug, title]);
  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
