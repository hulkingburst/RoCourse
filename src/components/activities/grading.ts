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

export function isAnswerCorrect(input: string, answer: string | string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  const accepted = Array.isArray(answer) ? answer : [answer];
  return accepted.some((a) => a && normalizeAnswer(a) === normalized);
}

/** True when the input parses as a number equal to `expected`. */
export function isNumericAnswer(input: string, expected: number): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return !Number.isNaN(parsed) && parsed === expected;
}

/** Given free-text answers that may be numbers or short strings, accept any match. */
export function isAnswerMatch(input: string, answer: string | string[]): boolean {
  if (isAnswerCorrect(input, answer)) return true;
  const accepted = Array.isArray(answer) ? answer : [answer];
  return accepted.some((a) => {
    const n = Number(a.trim());
    return !Number.isNaN(n) && isNumericAnswer(input, n);
  });
}
