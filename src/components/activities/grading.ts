/**
 * Tolerant answer checking for code exercises.
 *
 * Code answers are graded by normalising whitespace, case, semicolons and
 * comments, then comparing against one or more accepted answers. This is
 * deliberately forgiving for the one-to-a-few-line exercises in this course.
 */

import type { useTranslations } from "next-intl";

export type Translator = ReturnType<typeof useTranslations>;

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

function cleanCode(input: string): string {
  return input
    .replace(/--.*$/gm, "")
    .replace(/;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function codeTokens(input: string): string[] {
  return (
    input
      .match(/"[^"]*"|'[^']*'|\d+|[a-z][a-z0-9_]*|[^\s\w]/g)
      ?.filter((token) => token.trim().length > 0) ?? []
  );
}

/**
 * Builds a spoiler-free hint explaining what's wrong with `input`, compared
 * against the accepted answers. Returns null when the input is empty or no
 * specific issue can be diagnosed. Exact answers are intentionally NOT included
 * here — they belong in the answer-reveal spoiler.
 */
export function generateHint(
  input: string,
  answer: string | string[],
  options: AnswerOptions | undefined,
  t: Translator
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const accepted = (Array.isArray(answer) ? answer : [answer])
    .map((a) => a.trim())
    .filter(Boolean);
  if (accepted.length === 0) return null;
  if (isAnswerCorrect(input, answer, options)) return null;

  const inputClean = cleanCode(input).toLowerCase();
  const acceptedClean = accepted.map((a) => cleanCode(a).toLowerCase());

  if (options?.strictLocal && !/^\s*local\b/.test(inputClean)) {
    return t("hintMissingLocal");
  }

  const inputTokens = codeTokens(inputClean);
  let best = acceptedClean[0];
  let bestOverlap = -1;
  for (const candidate of acceptedClean) {
    const candidateTokens = codeTokens(candidate);
    const overlap = candidateTokens.filter((token) =>
      inputTokens.includes(token)
    ).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = candidate;
    }
  }
  const bestTokens = codeTokens(best);

  const nameOf = (s: string) => {
    const match = s.match(/(?:^|\s)(?:local\s+)?([a-z_][a-z0-9_]*)\s*=\s*[^=]/);
    return match ? match[1] : null;
  };
  const inputName = nameOf(inputClean);
  const bestName = nameOf(best);
  const rhsOf = (s: string) => {
    const index = s.indexOf("=");
    return index === -1 ? null : s.slice(index + 1).trim();
  };
  const inputRhs = rhsOf(inputClean);
  const bestRhs = rhsOf(best);

  if (bestRhs !== null && !inputClean.includes("=")) {
    return t("hintMissingEquals");
  }

  if (bestName !== null && inputName !== null && inputName !== bestName) {
    return t("hintNameMismatch");
  }

  if (bestRhs !== null && inputRhs === null) {
    return t("hintMissingValue");
  }

  if (bestRhs !== null && inputRhs !== null && bestRhs !== inputRhs) {
    if (inputRhs.startsWith(bestRhs) && inputRhs.length > bestRhs.length) {
      return t("hintExtraParts");
    }
    const isQuoted = (s: string) => /^['"].*['"]$/.test(s);
    const bestQuoted = isQuoted(bestRhs);
    const inputQuoted = isQuoted(inputRhs);
    if (!bestQuoted && inputQuoted) {
      return t("hintNumberNotString");
    }
    if (bestQuoted && !inputQuoted) {
      return t("hintStringNotNumber");
    }
    if (bestQuoted && inputQuoted) {
      return t("hintStringMismatch");
    }
    const bestNum = Number(bestRhs);
    const inputNum = Number(inputRhs);
    if (!Number.isNaN(bestNum) && !Number.isNaN(inputNum)) {
      return t("hintNumberMismatch");
    }
    return t("hintRhsMismatch");
  }

  const missing = bestTokens.filter((token) => !inputTokens.includes(token));
  if (missing.length > 0) {
    const structural = missing.filter(
      (token) => !/^['"]/.test(token) && !/^\d+$/.test(token)
    );
    if (structural.length === 1) {
      return t("hintMissingToken", { token: structural[0] });
    }
    if (structural.length > 1) {
      return t("hintIncomplete");
    }
    return t("hintMissingValueGeneric");
  }

  const extra = inputTokens.filter((token) => !bestTokens.includes(token));
  if (extra.length > 0) {
    return t("hintExtraTokens");
  }

  return t("hintCompare");
}
