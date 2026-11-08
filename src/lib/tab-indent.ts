import * as React from "react";

/** One indent level — the four-space style used in every lesson code sample. */
const INDENT = "    ";

export interface IndentResult {
  value: string;
  /** Caret (or selection start) after the edit. */
  start: number;
  /** Selection end after the edit. */
  end: number;
}

/**
 * Indent (Tab) or outdent (Shift+Tab) the lines a selection touches.
 *
 * Lessons ask learners to write multi-line Luau, so Tab has to produce spaces
 * rather than move focus. Indenting touches every non-empty line in the
 * selected block (empty lines are left alone, so no trailing whitespace), and
 * both the caret and any selection are shifted to stay on the same text.
 *
 * Returns `null` when an outdent would remove nothing — the caller then lets
 * the key fall through to normal focus navigation instead of swallowing it.
 */
export function applyTabIndent(
  value: string,
  start: number,
  end: number,
  outdent = false
): IndentResult | null {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  // A selection that ends exactly at the start of a line must not drag that
  // whole line into the edit — only the lines the learner actually highlighted.
  const endsAtLineStart = end > start && value[end - 1] === "\n";
  const nextBreak = value.indexOf("\n", end);
  const to = endsAtLineStart
    ? end
    : nextBreak === -1
      ? value.length
      : nextBreak;
  const lines = value.slice(from, to).split("\n");

  if (!outdent) {
    let added = 0;
    let firstAdded = 0;
    const indented = lines.map((line, index) => {
      if (line.trim() === "") return line;
      added += INDENT.length;
      if (index === 0) firstAdded = INDENT.length;
      return INDENT + line;
    });
    return {
      value: value.slice(0, from) + indented.join("\n") + value.slice(to),
      start: start + firstAdded,
      end: end + added,
    };
  }

  const removals = lines.map((line) => {
    if (line.startsWith("\t")) return 1;
    const spaces = /^ */.exec(line)?.[0].length ?? 0;
    return Math.min(spaces, INDENT.length);
  });
  if (removals.every((removed) => removed === 0)) return null;

  const total = removals.reduce((sum, removed) => sum + removed, 0);
  const newStart = Math.max(from, start - removals[0]);
  return {
    value:
      value.slice(0, from) +
      lines.map((line, index) => line.slice(removals[index])).join("\n") +
      value.slice(to),
    start: newStart,
    end: Math.max(newStart, end - total),
  };
}

/**
 * `onKeyDown` handler for a controlled code textarea that makes Tab insert an
 * indent (and Shift+Tab remove one) instead of leaving the field.
 *
 * Escape followed by Tab still moves focus out: without that escape hatch,
 * inserting whitespace on Tab would trap keyboard users inside the editor.
 */
export function useTabIndent(onChange: (value: string) => void) {
  const escapedRef = React.useRef(false);

  return React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape") {
        escapedRef.current = true;
        return;
      }
      if (
        event.key !== "Tab" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        escapedRef.current = false;
        return;
      }
      if (escapedRef.current) {
        escapedRef.current = false;
        return;
      }

      const element = event.currentTarget;
      const result = applyTabIndent(
        element.value,
        element.selectionStart,
        element.selectionEnd,
        event.shiftKey
      );
      // Unindented line + Shift+Tab → let focus move as it normally would.
      if (!result) return;

      event.preventDefault();
      onChange(result.value);
      const { start, end } = result;
      // React owns `value`, so the caret can only be restored once it has
      // re-rendered the textarea with the new text.
      requestAnimationFrame(() => {
        element.setSelectionRange(start, end);
      });
    },
    [onChange]
  );
}
