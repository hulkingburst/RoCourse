import { getCompletions, getSnapshot } from "@/lib/sync";
import { sanitizeSnapshot } from "@/lib/sanitize-snapshot";
import { PROGRESS_SCHEMA_VERSION } from "@/lib/sync-types";
import type { ProgressExport } from "@/lib/sync-types";

/**
 * Produces the learner-owned progress backup file. The snapshot is re-run
 * through the sanitizer so the export never carries malformed data even if the
 * live store somehow does, and the completion list is derived the same way the
 * cloud sync does it. Pure client-side: nothing is sent over the network.
 */
export function buildProgressExport(): ProgressExport {
  const progress = sanitizeSnapshot(getSnapshot());
  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    completions: getCompletions(progress),
  };
}

/** Deterministic backup filename, e.g. `rocourse-progress-2026-04-19.json`. */
export function progressExportFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `rocourse-progress-${key}.json`;
}
