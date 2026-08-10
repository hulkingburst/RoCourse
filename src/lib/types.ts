export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface LessonFrontmatter {
  slug: string;
  title: string;
  description: string;
  sectionId: string;
  order: number;
  difficulty: Difficulty;
  estimatedMinutes: number;
  tags: string[];
  objectives: string[];
  prerequisites?: string[];
  keywords?: string[];
}

export interface CourseSectionConfig {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface LessonMeta extends LessonFrontmatter {
  sectionTitle: string;
  sectionOrder: number;
  /** Number of graded activity steps in the lesson — the medal's total. */
  activityCount: number;
}

export interface CourseSection {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonMeta[];
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export interface Lesson {
  meta: LessonMeta;
  content: string;
  headings: Heading[];
}

export interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  sectionId: string;
  sectionTitle: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  tags: string[];
  keywords: string[];
  headings: string[];
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
