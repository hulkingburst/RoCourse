/**
 * Splits a lesson's raw MDX source into steps using `<Step>` boundaries.
 *
 * Splitting happens on the source (not the compiled tree) because
 * `next-mdx-remote-client/rsc` returns `content` as a lazy `<Content />`
 * element whose children only materialise at render time. Each step is then
 * compiled independently by the lesson page.
 */

export interface StepSource {
  /** A chunk of MDX source for one step. */
  source: string;
  /** True when the step contains at least one gated activity component. */
  hasActivity: boolean;
}

const STEP_TAG_RE = /<Step\b[^>]*>|<\/Step\s*>/g;

const ACTIVITY_TAGS = [
  "FillBlank",
  "WriteCode",
  "PredictOutput",
  "RunCode",
  "FixBug",
  "ArrangeCode",
  "Mcq",
  "ChooseBuild",
];

const ACTIVITY_TAG_RE = new RegExp(`<(${ACTIVITY_TAGS.join("|")})\\b`);

/** Activities whose result is graded — these count toward the lesson medal. */
const GRADED_ACTIVITY_TAGS = ACTIVITY_TAGS.filter((tag) => tag !== "ChooseBuild");
const GRADED_ACTIVITY_TAG_RE = new RegExp(`<(${GRADED_ACTIVITY_TAGS.join("|")})\\b`);

function maskFences(source: string): string {
  return source.replace(/```[\s\S]*?```/g, (block) => " ".repeat(block.length));
}

/** True when the source contains a gated activity tag outside code fences. */
export function detectActivity(source: string): boolean {
  return ACTIVITY_TAG_RE.test(maskFences(source));
}

/** True when the source contains a graded activity (ChooseBuild is not graded). */
export function detectGradedActivity(source: string): boolean {
  return GRADED_ACTIVITY_TAG_RE.test(maskFences(source));
}

/** Number of steps containing at least one graded activity — the medal total. */
export function countActivitySteps(source: string): number {
  return splitLessonSource(source).filter((step) => detectGradedActivity(step.source)).length;
}

export function splitLessonSource(source: string): StepSource[] {
  const masked = maskFences(source);

  const boundaries: { index: number; open: boolean; length: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = STEP_TAG_RE.exec(masked)) !== null) {
    boundaries.push({
      index: match.index,
      open: !match[0].startsWith("</"),
      length: match[0].length,
    });
  }

  if (boundaries.length === 0) {
    const trimmed = source.trim();
    return trimmed ? [{ source: trimmed, hasActivity: detectActivity(trimmed) }] : [];
  }

  const chunks: string[] = [];

  const opening = source.slice(0, boundaries[0].index).trim();
  if (opening) chunks.push(opening);

  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    if (!boundary.open) continue;

    const close = boundaries[i + 1];
    const start = close && !close.open ? boundary.index + boundary.length : source.length;
    const end = close && !close.open ? close.index : source.length;
    const body = source.slice(start, end).trim();
    if (body) chunks.push(body);
    if (close && !close.open) i++;
  }

  const last = boundaries[boundaries.length - 1];
  if (!last.open) {
    const trailing = source.slice(last.index + last.length).trim();
    if (trailing) chunks.push(trailing);
  }

  return chunks.map((chunk) => ({
    source: chunk,
    hasActivity: detectActivity(chunk),
  }));
}
