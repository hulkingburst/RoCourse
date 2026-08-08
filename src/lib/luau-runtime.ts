"use client";

/**
 * Client-side Luau runtime backed by a Web Worker (see /luau/luau-worker.js).
 *
 * Executing Luau in a worker keeps the main thread responsive and lets us kill
 * runaway scripts (infinite loops) by terminating the worker. A fresh worker is
 * recreated automatically after a timeout.
 */

export interface LuauRunResult {
  /** Standard output produced by print() calls. */
  output: string;
  /** Compile/runtime error message, or null when the run succeeded. */
  error: string | null;
  /** True when the run was killed for exceeding the time budget. */
  timedOut: boolean;
  elapsedMs: number;
}

/** How long a script may run before it is killed as a possible infinite loop. */
const TIMEOUT_MS = 4000;

interface Pending {
  resolve: (result: LuauRunResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function resolveAll(message: string): void {
  const entries = [...pending.entries()];
  pending.clear();
  for (const [, entry] of entries) {
    clearTimeout(entry.timer);
    entry.resolve({
      output: "",
      error: message,
      timedOut: false,
      elapsedMs: 0,
    });
  }
}

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker("/luau/luau-worker.js");

  worker.onmessage = (event) => {
    const data = event.data as {
      id: number;
      output?: string;
      error?: string;
      elapsed?: number;
    };
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    clearTimeout(entry.timer);
    entry.resolve({
      output: data.output ?? "",
      error: data.error ?? null,
      timedOut: false,
      elapsedMs: data.elapsed ?? 0,
    });
  };

  worker.onerror = () => {
    worker = null;
    resolveAll(
      "Failed to load the Luau engine. Check that /luau/luau-worker.js is reachable."
    );
  };

  return worker;
}

/**
 * Run a Luau program and resolve with its output. Scripts are given a fixed
 * time budget; on timeout the worker is terminated (breaking infinite loops)
 * and a fresh one is created for the next run.
 */
export function runLuau(code: string): Promise<LuauRunResult> {
  return new Promise<LuauRunResult>((resolve) => {
    const id = ++nextId;

    const timer = setTimeout(() => {
      pending.delete(id);
      worker?.terminate();
      worker = null;
      resolve({
        output: "",
        error:
          "Execution timed out. This usually means your code has an infinite loop.",
        timedOut: true,
        elapsedMs: TIMEOUT_MS,
      });
    }, TIMEOUT_MS);

    pending.set(id, { resolve, timer });

    try {
      getWorker().postMessage({ id, code });
    } catch (err) {
      pending.delete(id);
      clearTimeout(timer);
      resolve({
        output: "",
        error: err instanceof Error ? err.message : String(err),
        timedOut: false,
        elapsedMs: 0,
      });
    }
  });
}

/** Kill any in-flight run immediately (used by the Stop button). */
export function stopLuau(): void {
  resolveAll("Stopped by the user.");
  worker?.terminate();
  worker = null;
}
