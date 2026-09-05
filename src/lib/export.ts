import { applySnapshot, getCompletions, getSnapshot } from "@/lib/sync";
import { sanitizeSnapshot } from "@/lib/sanitize-snapshot";
import { PROGRESS_SCHEMA_VERSION } from "@/lib/sync-types";
import type { ProgressExport, ProgressSnapshot } from "@/lib/sync-types";

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

export type ProgressImportResult =
  | { ok: true; progress: ProgressSnapshot }
  | { ok: false; reason: "not-json" | "invalid-shape" };

/**
 * Reads a progress backup file. Accepts both the wrapped export shape
 * (`{ schemaVersion, exportedAt, progress, completions }`) and a bare
 * serialized snapshot. Every field is re-run through the sanitizer so junk or
 * out-of-range values can never poison the store.
 */
export function parseProgressImport(raw: string): ProgressImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "not-json" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, reason: "invalid-shape" };
  }
  const candidate = (
    "progress" in parsed ? parsed.progress : parsed
  ) as Partial<ProgressSnapshot> | undefined;
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, reason: "invalid-shape" };
  }
  return { ok: true, progress: sanitizeSnapshot(candidate) };
}

/**
 * Restores the local store from a parsed backup. `lastUpdated` is stamped now
 * so the restored state is unambiguously the newest side for the next cloud
 * sync (a restore is a deliberate local action). No network call happens here.
 */
export function applyImportedProgress(snapshot: ProgressSnapshot): void {
  applySnapshot(snapshot, new Date().toISOString());
}
