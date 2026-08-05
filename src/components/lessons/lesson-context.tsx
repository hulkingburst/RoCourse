"use client";

import { createContext, useContext } from "react";

export interface LessonContextValue {
  slug: string;
  title: string;
}

export const LessonContext = createContext<LessonContextValue>({
  slug: "",
  title: "",
});

export function useLesson(): LessonContextValue {
  return useContext(LessonContext);
}
