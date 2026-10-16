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
  /**
   * Sections that sit outside the main path. Their first lesson opens without
   * the lessons before it, so a learner can start there at any point.
   */
  optional?: boolean;
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
  optional?: boolean;
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
