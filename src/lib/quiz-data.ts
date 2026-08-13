export interface QuizQuestion {
  id: string;
  /** Index of the correct option (0–3). */
  answer: number;
}

/** How many questions a single quick quiz draws (randomly) from the bank. */
export const QUIZ_SIZE = 10;

/** How long a 60-second drill lasts, in seconds. */
export const DRILL_TIME_SECONDS = 60;

/**
 * The bank for the 60-second drill: deliberately harder than the quick quiz —
 * edge cases, tricky semantics, and multi-step reasoning.
 */
export const DRILL_QUESTIONS: QuizQuestion[] = [
  { id: "d1", answer: 2 },
  { id: "d2", answer: 1 },
  { id: "d3", answer: 1 },
  { id: "d4", answer: 2 },
  { id: "d5", answer: 1 },
  { id: "d6", answer: 3 },
  { id: "d7", answer: 0 },
  { id: "d8", answer: 1 },
  { id: "d9", answer: 0 },
  { id: "d10", answer: 0 },
  { id: "d11", answer: 1 },
  { id: "d12", answer: 1 },
  { id: "d13", answer: 2 },
  { id: "d14", answer: 1 },
  { id: "d15", answer: 1 },
  { id: "d16", answer: 2 },
  { id: "d17", answer: 1 },
  { id: "d18", answer: 3 },
  { id: "d19", answer: 0 },
  { id: "d20", answer: 1 },
  { id: "d21", answer: 0 },
  { id: "d22", answer: 0 },
  { id: "d23", answer: 0 },
  { id: "d24", answer: 0 },
  { id: "d25", answer: 0 },
];

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: "q1", answer: 2 },
  { id: "q2", answer: 0 },
  { id: "q3", answer: 2 },
  { id: "q4", answer: 3 },
  { id: "q5", answer: 3 },
  { id: "q6", answer: 1 },
  { id: "q7", answer: 0 },
  { id: "q8", answer: 1 },
  { id: "q9", answer: 0 },
  { id: "q10", answer: 3 },
  { id: "q11", answer: 2 },
  { id: "q12", answer: 2 },
  { id: "q13", answer: 3 },
  { id: "q14", answer: 0 },
  { id: "q15", answer: 3 },
  { id: "q16", answer: 1 },
  { id: "q17", answer: 0 },
  { id: "q18", answer: 0 },
  { id: "q19", answer: 2 },
  { id: "q20", answer: 3 },
  { id: "q21", answer: 3 },
  { id: "q22", answer: 1 },
  { id: "q23", answer: 0 },
  { id: "q24", answer: 1 },
  { id: "q25", answer: 2 },
  { id: "q26", answer: 2 },
  { id: "q27", answer: 0 },
  { id: "q28", answer: 3 },
  { id: "q29", answer: 0 },
  { id: "q30", answer: 2 },
  { id: "q31", answer: 0 },
  { id: "q32", answer: 1 },
  { id: "q33", answer: 2 },
  { id: "q34", answer: 1 },
  { id: "q35", answer: 3 },
  { id: "q36", answer: 1 },
  { id: "q37", answer: 2 },
  { id: "q38", answer: 1 },
  { id: "q39", answer: 1 },
  { id: "q40", answer: 3 },
  { id: "q41", answer: 3 },
  { id: "q42", answer: 1 },
  { id: "q43", answer: 2 },
  { id: "q44", answer: 1 },
  { id: "q45", answer: 0 },
  { id: "q46", answer: 0 },
  { id: "q47", answer: 2 },
  { id: "q48", answer: 3 },
  { id: "q49", answer: 3 },
  { id: "q50", answer: 1 },
];
