/**
 * Tolerant answer checking for code exercises.
 *
 * Code answers are graded by normalising whitespace, case, semicolons and
 * comments, then comparing against one or more accepted answers. This is
 * deliberately forgiving for the one-to-a-few-line exercises in this course.
 *
 * An answer may be:
 *  - a single string           -> one accepted answer;
 *  - a flat array of strings   -> accepted as individual one-line answers AND
 *    as one multi-line snippet, so learners who write the expected lines together
 *    ("typed the whole thing") are accepted too;
 *  - a nested array (string[][]) -> each inner array is its own accepted answer
 *    and may span several lines, for steps with several equally-valid solutions.
 *
 * A multi-line snippet whose first line is a `local x = ...` declaration also
 * accepts the remaining lines on their own: the declaration reads as setup that
 * may already exist in the starter code, so learners who type just the meaningful
 * lines are accepted.
 */

import type { useTranslations } from "next-intl";

export type Translator = ReturnType<typeof useTranslations>;

/** A typed answer: one string, a flat list of lines, or explicit alternatives. */
export type AnswerSpec = string | string[] | string[][];

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

interface AnswerVariant {
  /** Normalized lines of one accepted answer; a snippet keeps its lines apart. */
  lines: string[];
  /**
   * True when the variant's first line is a `local x = ...` declaration: the
   * remaining lines are then also accepted on their own, since the declaration
   * reads as setup that may already exist in the starter code.
   */
  sliceSetup: boolean;
}

/**
 * Splits an answer into its accepted variants, normalizing every line through
 * `normalizeLine`. A plain string is one one-line variant; a flat array keeps
 * today's meaning (every element is its own accepted answer) and, when it has
 * more than one line, also becomes a single multi-line snippet; a nested array
 * lists explicit alternatives where each inner array is its own variant.
 */
function answerVariants(
  answer: AnswerSpec,
  normalizeLine: (s: string) => string
): AnswerVariant[] {
  const norm = (value: string): string => normalizeLine(value).trim();

  if (typeof answer === "string") {
    const lines = [norm(answer)].filter(Boolean);
    return lines.length ? [{ lines, sliceSetup: false }] : [];
  }

  if (answer.length > 0 && Array.isArray(answer[0])) {
    return (answer as string[][]).map((variant) => {
      const value = Array.isArray(variant) ? variant : [variant];
      const lines = value.map(norm).filter(Boolean);
      const sliceSetup =
        value.length > 1 && LEADING_LOCAL_RE.test(String(value[0]));
      return { lines, sliceSetup };
    });
  }

  const lines = (answer as string[]).map(norm).filter(Boolean);
  if (lines.length === 0) return [];
  const variants: AnswerVariant[] = lines.map((line) => ({
    lines: [line],
    sliceSetup: false,
  }));
  if (lines.length > 1) {
    const rawLines = answer as string[];
    variants.push({
      lines,
      sliceSetup: LEADING_LOCAL_RE.test(String(rawLines[0])),
    });
  }
  return variants;
}

/** True when a line reads as a leading `local x = ...` declaration. */
const LEADING_LOCAL_RE = /^\s*local\s+[a-z_][a-z0-9_]*\s*=/;

function variantMatchesInput(
  normalized: string,
  lines: string[],
  sliceSetup: boolean
): boolean {
  if (lines.length === 0 || !normalized) return false;
  const joined = lines.join("");
  if (normalized === joined) return true;

  if (lines.length === 1) {
    // Tolerate the single answer typed inside matching quotes.
    const wrapped =
      normalized.length >= 2 &&
      normalized[0] === normalized[normalized.length - 1] &&
      /^['"]$/.test(normalized[0]);
    return wrapped && normalized.slice(1, -1) === joined;
  }

  // A leading `local x = ...` line reads as setup that may already exist, so
  // the remaining lines alone are also an accepted answer. They must match the
  // WHOLE input, so (unlike the full-snippet group below) extra lines aren't
  // allowed — otherwise a snippet typed in reverse order would pass.
  if (sliceSetup && normalized === lines.slice(1).join("")) return true;

  // Multi-line snippet: every line must appear in order. This accepts learners
  // who write the expected lines together with extra surrounding code.
  let pos = 0;
  for (const line of lines) {
    const idx = normalized.indexOf(line, pos);
    if (idx === -1) return false;
    pos = idx + line.length;
  }
  return true;
}

export function isAnswerCorrect(
  input: string,
  answer: AnswerSpec,
  options?: AnswerOptions
): boolean {
  const normalize = options?.strictLocal ? normalizeAnswer : normalizeAnswerLenient;
  const normalized = normalize(input);
  if (!normalized) return false;
  return answerVariants(answer, normalize).some((variant) =>
    variantMatchesInput(normalized, variant.lines, variant.sliceSetup)
  );
}

/** True when the input parses as a number equal to `expected`. */
export function isNumericAnswer(input: string, expected: number): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return !Number.isNaN(parsed) && parsed === expected;
}

function singleLineAnswers(answer: AnswerSpec): string[] {
  if (typeof answer === "string") return [answer];
  if (answer.length > 0 && Array.isArray(answer[0])) {
    return (answer as string[][]).map((variant) => {
      const value = Array.isArray(variant) ? variant : [variant];
      return String(value[0] ?? "");
    });
  }
  return (answer as string[]).map(String);
}

/** Given free-text answers that may be numbers or short strings, accept any match. */
export function isAnswerMatch(
  input: string,
  answer: AnswerSpec,
  options?: AnswerOptions
): boolean {
  if (isAnswerCorrect(input, answer, options)) return true;
  for (const candidate of singleLineAnswers(answer)) {
    const n = Number(candidate.trim());
    if (!Number.isNaN(n) && isNumericAnswer(input, n)) return true;
  }
  return false;
}

/**
 * Renders the accepted answer(s) for the reveal. A single answer is itself; a
 * snippet (or every alternative) is shown with its lines joined.
 */
export function answerPreview(answer: AnswerSpec): string | undefined {
  if (typeof answer === "string") return answer;
  if (answer.length > 0 && Array.isArray(answer[0])) {
    const first = answer[0] as string[] | string;
    return (Array.isArray(first) ? first : [first]).join("\n");
  }
  return (answer as string[]).join("\n");
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

/** Candidate strings used by the hint: every explicit alternative, joined. */
function hintCandidates(answer: AnswerSpec): string[] {
  if (typeof answer === "string") return [answer];
  const outer = answer as (string | string[])[];
  const variants =
    outer.length > 0 && Array.isArray(outer[0])
      ? (answer as string[][])
      : [outer];
  return variants.map((variant) =>
    (Array.isArray(variant) ? variant : [variant]).join("\n")
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
  answer: AnswerSpec,
  options: AnswerOptions | undefined,
  t: Translator
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidates = hintCandidates(answer)
    .map((a) => a.trim())
    .filter(Boolean);
  if (candidates.length === 0) return null;
  if (isAnswerCorrect(input, answer, options)) return null;

  const inputClean = cleanCode(input).toLowerCase();
  const acceptedClean = candidates.map((a) => cleanCode(a).toLowerCase());

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