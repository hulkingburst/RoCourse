"use client";

import * as React from "react";
import {
  useProgressStore,
  type FinishedPath,
} from "@/lib/progress-store";

/**
 * Renders its children only when the learner's chosen final-project path
 * matches `name`. Used inside the final project lesson to show just one
 * game's build steps. Renders nothing (and nothing on the server) until the
 * progress store has hydrated, so there's no SSR mismatch.
 */
export function Variant({
  name,
  children,
}: {
  name: FinishedPath;
  children: React.ReactNode;
}) {
  const finishedPath = useProgressStore((state) => state.finishedPath);
  const hydrated = useProgressStore((state) => state.hydrated);

  if (!hydrated) return null;
  if (finishedPath !== name) return null;
  return <>{children}</>;
}
