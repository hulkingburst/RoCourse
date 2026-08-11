"use client";

/**
 * Hidden-test harness shared by the runtime-graded activities (RunCode and the
 * checks mode of WriteCode). The learner's code runs inside a wrapper that
 * captures print output (into `__log` for assertions) and exposes a `check`
 * helper; a final marker line reports `passed/total` for grading.
 */

export const RESULT_MARKER = "__LUAU_RESULT__";

export interface CheckSummary {
  passed: number;
  total: number;
}

/**
 * Builds the full script: harness prelude, user code, then the hidden checks,
 * then a marker line with the pass count.
 */
export function buildChecksScript(userCode: string, checks: string): string {
  return [
    "local __realPrint = print",
    "local __log = {}",
    "local __passed = 0",
    "local __total = 0",
    "local function check(condition, message)",
    "    __total += 1",
    "    if condition then",
    "        __passed += 1",
    "    else",
    '        __realPrint("FAIL: " .. tostring(message))',
    "    end",
    "end",
    "print = function(...)",
    "    local parts = {}",
    '    for i = 1, select("#", ...) do',
    "        table.insert(parts, tostring(select(i, ...)))",
    "    end",
    "    local line = table.concat(parts, \"\\t\")",
    "    table.insert(__log, line)",
    "    __realPrint(line)",
    "end",
    "",
    userCode,
    "",
    checks,
    `__realPrint("${RESULT_MARKER} " .. tostring(__passed) .. "/" .. tostring(__total))`,
  ].join("\n");
}

/** Extracts the final pass/total line, or null when the run didn't finish. */
export function parseCheckResult(output: string): CheckSummary | null {
  const lines = output.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i]
      .trim()
      .match(new RegExp(`^${RESULT_MARKER} (\\d+)/(\\d+)$`));
    if (match) {
      return { passed: Number(match[1]), total: Number(match[2]) };
    }
  }
  return null;
}

/** Removes marker line(s) so the learner sees only their own output. */
export function stripResultMarker(output: string): string {
  return output
    .split("\n")
    .filter((line) => !line.trim().startsWith(RESULT_MARKER))
    .join("\n")
    .trim();
}
