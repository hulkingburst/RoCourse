/**
 * Tolerant answer checking for code exercises.
 *
 * Code answers are graded by normalising whitespace, case, semicolons and
 * comments, then comparing against one or more accepted answers. This is
 * deliberately forgiving for the one-to-a-few-line exercises in this course.
 */

export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/--.*$/gm, "")
    .replace(/;/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** Drops a leading `local ` keyword at the start of each line. */
function stripLocalKeywords(input: string): string {
  return input.replace(/^\s*local\s+/gm, "");
}

/** Lenient normalization: a `local` keyword is treated as optional. */
function normalizeAnswerLenient(input: string): string {
  return normalizeAnswer(stripLocalKeywords(input));
}

export interface AnswerOptions {
  /** When true, a `local` keyword is required — omitting it is not accepted. */
  strictLocal?: boolean;
}

export function isAnswerCorrect(
  input: string,
  answer: string | string[],
  options?: AnswerOptions
): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  const accepted = Array.isArray(answer) ? answer : [answer];
  const exact = accepted.some((a) => a && normalizeAnswer(a) === normalized);
  if (exact) return true;
  if (options?.strictLocal) return false;

  const lenient = normalizeAnswerLenient(input);
  return accepted.some((a) => a && normalizeAnswerLenient(a) === lenient);
}

/** True when the input parses as a number equal to `expected`. */
export function isNumericAnswer(input: string, expected: number): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return !Number.isNaN(parsed) && parsed === expected;
}

/** Given free-text answers that may be numbers or short strings, accept any match. */
export function isAnswerMatch(
  input: string,
  answer: string | string[],
  options?: AnswerOptions
): boolean {
  if (isAnswerCorrect(input, answer, options)) return true;
  const accepted = Array.isArray(answer) ? answer : [answer];
  return accepted.some((a) => {
    const n = Number(a.trim());
    return !Number.isNaN(n) && isNumericAnswer(input, n);
  });
}
