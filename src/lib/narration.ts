/**
 * Narration text — the speech-only form of a lesson.
 *
 * The visible lesson never changes. This module rewrites the prose that the
 * Read Aloud button extracts from a rendered step into text a voice actually
 * reads well. Both narration paths share it, so there is exactly one set of
 * rules: the `/api/tts` route (ElevenLabs, server-side) and the browser speech
 * fallback in `read-aloud.tsx` (client-side) call `toNarrationText`.
 *
 * What it does:
 *  - Spoken forms for terms that must not be spelled out ("GUI" ->
 *    "gee-you-eye"), via one reusable table plus a camelCase splitter for
 *    identifiers ("ServerScriptService" -> "Server Script Service").
 *  - Markup is stripped, never spoken: heading markers, bullets, emphasis,
 *    backticks, code fences, link syntax, bare URLs, HTML, decorative symbols.
 *  - Sentence boundaries are restored: every line (paragraph, heading, list
 *    item, standalone line) ends in terminal punctuation, questions get a
 *    question mark, parentheses and em dashes become natural pauses.
 *
 * Kept pure and dependency-free so it can run on the server, in the browser,
 * and directly under `node` for checks. Lesson prose is authored in English
 * for every locale (the Spanish site translates its chrome, not the lessons),
 * so the term table applies to all narration.
 */

/**
 * Longest speech text the TTS route accepts. Every one of the 517 steps in
 * `content/lessons` is well under this (median 395 characters, longest 2045),
 * so real lessons always narrate; the cap only bounds abuse. Longer steps fall
 * back to the browser voice instead of failing the request.
 */
export const MAX_NARRATION_CHARS = 5000;

/** Raw extracted prose accepted before preprocessing (normalization shrinks). */
export const MAX_NARRATION_INPUT_CHARS = 6000;

/**
 * Acronyms that a voice must say as letters, never as a word. Lowercase
 * hyphenated spellings ("gee-you-eye") are how text-to-speech engines are told
 * to read letters naturally, with a beat between them instead of a stutter.
 */
const SPOKEN_ACRONYMS: Readonly<Record<string, string>> = {
  GUI: "gee-you-eye",
  UI: "you-eye",
  API: "ay-pee-eye",
  NPC: "en-pee-see",
  RNG: "are-en-gee",
  HUD: "aitch-you-dee",
  URL: "you-are-ell",
  XP: "ex-pee",
  ID: "eye-dee",
  WASD: "W-A-S-D",
};

/**
 * Products, data types, and abbreviations whose spoken form differs from what
 * is printed. Roblox type names are spelled out ("Vector3" -> "Vector three")
 * the way instructors say them in the videos this course follows.
 */
const SPOKEN_WORDS: Readonly<Record<string, string>> = {
  Luau: "Loo-ow",
  Lua: "Loo-ah",
  CFrame: "C-frame",
  Vector3: "Vector three",
  Vector2: "Vector two",
  Color3: "Color three",
  UDim2: "you-dim two",
  LocalPlayer: "Local Player",
  GetService: "Get Service",
  aka: "also known as",
};

/**
 * Abbreviations that carry internal periods. Token matching would lose the
 * trailing dot to punctuation, so they are one boundary-anchored phrase pass.
 */
const SPOKEN_PHRASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\be\.g\./gi, "for example"],
  [/\bi\.e\./gi, "that is"],
  [/\betc\./gi, "et cetera"],
  [/\bvs\./gi, "versus"],
];

const SPOKEN_TERMS: Readonly<Record<string, string>> = {
  ...SPOKEN_ACRONYMS,
  ...SPOKEN_WORDS,
};

/**
 * camelCase/PascalCase words that must not be split (an "i" prefix is not a
 * word boundary). Everything else with an internal case change reads as
 * separate words, which is what makes identifiers such as
 * ServerScriptService and HumanoidRootPart speakable without an entry each.
 */
const CAMEL_EXCEPTIONS = new Set(["iPhone", "iPad", "iPod", "iMac"]);

/** A line that exists only to separate content, never to be spoken. */
const DECORATIVE_LINE_RE = /^(?:[-*_=~•·<>]{2,})$/;

/** Lines that ask something and gain a "?" when the lesson omits it. */
const QUESTION_START_RE =
  /^(?:who|whose|what|which|when|where|why|how|do|does|did|can|could|would|should|will|is|are|was|were|have|has)\b/i;

/** Heading marker the DOM extractor emits (and raw Markdown already has). */
const HEADING_RE = /^#{1,6}\s+(.*)$/;

const LIST_MARKER_RE = /^(?:[-*+•]|\d{1,2}[.)])\s+/;

/**
 * Inline code that reads as a term rather than as source code: one short word
 * with no assignment, call, or string syntax. `LocalPlayer` is worth saying;
 * `game:GetService("Players")` is not, and stays silent for the learner to
 * read visually (whole code blocks are always skipped).
 */
const SPEAKABLE_CODE_RE = /^[A-Za-z0-9 ._#-]{1,40}$/;

/** True when inline code should be spoken as a word. */
export function isSpeakableCode(text: string | null | undefined): boolean {
  const value = (text ?? "").trim();
  return value.length > 0 && SPEAKABLE_CODE_RE.test(value);
}

/**
 * Removes every implementation-only character a voice must never pronounce.
 * Structural markup becomes line breaks; decoration simply disappears.
 */
function stripMarkup(input: string): string {
  let text = input.replace(/\r\n?/g, "\n");

  // Code fences never reach the voice (the DOM extractor skips code blocks),
  // but raw Markdown input is still cleaned so the rules hold either way.
  text = text.replace(/```[\s\S]*?```/g, "\n");
  text = text.replace(/```[\s\S]*$/g, "\n");

  // Links keep their label, never their target; bare URLs are dropped.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/https?:\/\/\S+/gi, " ");
  text = text.replace(/\bwww\.\S+/gi, " ");

  // HTML tags.
  text = text.replace(/<[^>]+>/g, " ");

  // Emphasis and inline code markers.
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2");
  // Inline code keeps its text only when it reads as a term; a snippet is
  // dropped rather than spelled out (whole code blocks are dropped above).
  text = text.replace(/`([^`]+)`/g, (_, code: string) =>
    isSpeakableCode(code) ? ` ${code} ` : " "
  );
  text = text.replace(/`/g, "");

  // Block structure: headings keep a marker (the punctuation pass treats them
  // as headings), blockquotes and list bullets lose theirs, rules vanish.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "# ");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s{0,3}(?:[-*+]|\d{1,2}[.)])\s+/gm, "");
  text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");

  // Entities and symbols that would otherwise be read as names.
  text = text
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/gi, (match) => {
      const entity = match.toLowerCase();
      if (entity === "&amp;") return "&";
      if (entity === "&lt;") return "<";
      if (entity === "&gt;") return ">";
      return " ";
    })
    .replace(/\s&\s/g, " and ")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/#(\d)/g, "number $1")
    // Arrows and breadcrumbs read as a pause: "A -> B", "A > B".
    .replace(/[-=]+>\s*/g, ", ")
    .replace(/\s*>\s*/g, ", ")
    .replace(/[|•·→]/g, ", ");

  // Quotes carry no sound, and typographic punctuation reads better as plain
  // punctuation.
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D"]/g, " ")
    .replace(/[\u2013\u2014]/g, ", ")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ");

  return text.replace(/[ \t]+/g, " ").replace(/[ \t]+$/gm, "");
}

/** Speaks one whitespace-delimited token via the table or a camelCase split. */
function speakToken(token: string): string {
  const match = /^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/.exec(token);
  if (!match) return token;
  const [, lead, core, tail] = match;
  if (!core) return token;

  // Possessives and plurals speak as the base term with its ending attached
  // ("GUI's" -> "gee-you-eye's", "GUIs" -> "gee-you-eyes", "NPCs" likewise).
  const possessive = /'s$|'$/.test(core);
  const base = possessive ? core.replace(/'s?$/, "") : core;
  const plural = !possessive && /^[A-Z][A-Za-z]*s$/.test(base) && !SPOKEN_TERMS[base];
  const lookup = plural ? base.slice(0, -1) : base;
  const spoken = SPOKEN_TERMS[lookup] ?? splitCamelCase(base);
  if (!spoken) return token;
  const suffix = possessive ? "'s" : plural && SPOKEN_TERMS[lookup] ? "s" : "";
  return `${lead}${spoken}${suffix}${tail}`;
}

/** "ServerScriptService" -> "Server Script Service", or null when untouched. */
function splitCamelCase(word: string): string | null {
  if (CAMEL_EXCEPTIONS.has(word)) return null;
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(word)) return null;
  if (!/[a-z][A-Z]|[A-Z][A-Z][a-z]/.test(word)) return null;
  return word
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/** Applies the pronunciation table and camelCase splitting to a line. */
function speakTerms(text: string): string {
  return text
    .split(/(\s+)/)
    .map((chunk) => (chunk.trim() ? speakToken(chunk) : chunk))
    .join("");
}

/**
 * Turns one extracted line into a spoken sentence: list markers and leftover
 * decoration out, spoken terms in, and exactly one terminal punctuation mark
 * so the voice pauses at the end of every paragraph, heading, and bullet.
 */
function punctuateLine(line: string): string {
  let text = line.trim();
  if (!text || DECORATIVE_LINE_RE.test(text)) return "";

  let heading = false;
  const headingMatch = HEADING_RE.exec(text);
  if (headingMatch) {
    heading = true;
    text = headingMatch[1].trim();
  }
  text = text.replace(LIST_MARKER_RE, "").trim();
  if (!text || DECORATIVE_LINE_RE.test(text)) return "";
  // Lines that hold no words (a stray marker or arrow) are not spoken at all.
  if (!/[A-Za-z0-9]/.test(text)) return "";

  text = speakTerms(text);

  // Parentheses become pauses; a trailing colon/comma/semicolon becomes the
  // pause itself, and doubled punctuation collapses.
  text = text
    .replace(/\(/g, ", ")
    .replace(/\)/g, ", ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,+/g, ",")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/^\s*[,;:]+/, "")
    .replace(/[,;:]+\s*$/, ".")
    .replace(/([.!?])\s*[.!?]+/g, "$1")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text) return "";
  if (!/[.!?]$/.test(text)) {
    // A line that asks something gains its question mark; short fragments
    // ("What it is" as a table header) stay statements rather than questions.
    const words = text.split(/\s+/).length;
    const question = !heading && words >= 4 && QUESTION_START_RE.test(text);
    text += question ? "?" : ".";
  }
  return text;
}

/**
 * The speech version of a lesson. Input is the visible prose (see
 * `extractProseText`); output is what gets sent to ElevenLabs or the browser
 * voice. The visible lesson is never touched.
 */
export function toNarrationText(input: string): string {
  let source = String(input ?? "");
  for (const [pattern, spoken] of SPOKEN_PHRASES) source = source.replace(pattern, spoken);
  const lines = stripMarkup(source)
    .split("\n")
    .map((line) => punctuateLine(line))
    .filter(Boolean);
  return lines.join("\n").trim();
}
