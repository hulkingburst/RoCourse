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
  options?: AnswerOptions
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
    return "Add the `local` keyword at the start — without it, this becomes a global variable.";
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
    return "You're missing the `= value` — a declaration assigns a value to the name.";
  }

  if (bestName !== null && inputName !== null && inputName !== bestName) {
    return "The variable name doesn't match what the rest of the script expects — check the name.";
  }

  if (bestRhs !== null && inputRhs === null) {
    return "A declaration needs `= <value>` after the name — you're missing the value.";
  }

  if (bestRhs !== null && inputRhs !== null && bestRhs !== inputRhs) {
    if (inputRhs.startsWith(bestRhs) && inputRhs.length > bestRhs.length) {
      return "Your line has extra parts after the value — keep it to the single corrected line.";
    }
    const isQuoted = (s: string) => /^['"].*['"]$/.test(s);
    const bestQuoted = isQuoted(bestRhs);
    const inputQuoted = isQuoted(inputRhs);
    if (!bestQuoted && inputQuoted) {
      return "The value should be a number, not a string — remove the quotes.";
    }
    if (bestQuoted && !inputQuoted) {
      return "The value should be a string — wrap it in quotes.";
    }
    if (bestQuoted && inputQuoted) {
      return "The string value isn't what the script expects — check the text.";
    }
    const bestNum = Number(bestRhs);
    const inputNum = Number(inputRhs);
    if (!Number.isNaN(bestNum) && !Number.isNaN(inputNum)) {
      return "The value on the right side of `=` is wrong — double-check the number.";
    }
    return "The value after `=` isn't what the script expects — check what's being assigned.";
  }

  const missing = bestTokens.filter((token) => !inputTokens.includes(token));
  if (missing.length > 0) {
    const structural = missing.filter(
      (token) => !/^['"]/.test(token) && !/^\d+$/.test(token)
    );
    if (structural.length === 1) {
      return `You're missing \`${structural[0]}\` — compare your line to the pattern shown in the lesson.`;
    }
    if (structural.length > 1) {
      return "Your line looks incomplete — compare it to the pattern shown in the lesson.";
    }
    return "You're missing a value — check what should be assigned.";
  }

  const extra = inputTokens.filter((token) => !bestTokens.includes(token));
  if (extra.length > 0) {
    return "Your line has extra parts — keep it to the single corrected line.";
  }

  return "Compare your line to the pattern shown in the lesson — what's different?";
}
