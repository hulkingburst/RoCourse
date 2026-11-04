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
  /**
   * True when the sandbox itself could not start, so the learner's code never
   * ran. This is different from a compile/runtime error in that code: it is a
   * platform failure and must not be graded as a wrong answer.
   */
  engineFailure?: boolean;
  elapsedMs: number;
}

/** How long a script may run once it starts before it is killed. */
const EXECUTION_TIMEOUT_MS = 4000;

/**
 * How long the engine may take to download and instantiate. The wasm build is
 * fetched on first use (roughly 680 KB), so this is deliberately much larger
 * than the execution budget: a slow connection must not be reported as the
 * learner's script looping forever.
 */
const STARTUP_TIMEOUT_MS = 30_000;

interface Pending {
  /** Resolve the run exactly once and stop both watchdogs. */
  finish: (result: LuauRunResult) => void;
  /** Arm the execution watchdog now that the engine is ready. */
  startExecution: () => void;
}

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function resolveAll(message: string, engineFailure = false): void {
  const entries = [...pending.values()];
  pending.clear();
  for (const entry of entries) {
    entry.finish({
      output: "",
      error: message,
      timedOut: false,
      engineFailure,
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
      started?: boolean;
      output?: string;
      error?: string;
      engineFailure?: boolean;
      elapsed?: number;
    };
    const entry = pending.get(data.id);
    if (!entry) return;

    if (data.started) {
      entry.startExecution();
      return;
    }

    pending.delete(data.id);
    entry.finish({
      output: data.output ?? "",
      error: data.error ?? null,
      timedOut: false,
      engineFailure: data.engineFailure === true,
      elapsedMs: data.elapsed ?? 0,
    });
  };

  worker.onerror = () => {
    worker = null;
    resolveAll(
      "The code runner couldn't start. Check your connection and try again.",
      true
    );
  };

  return worker;
}

/**
 * Run a Luau program and resolve with its output. The engine gets its own
 * startup budget; the script's execution budget starts only once the worker
 * reports that the runtime is ready. On an execution timeout the worker is
 * terminated (breaking infinite loops) and a fresh one is created for the next
 * run.
 */
export function runLuau(code: string): Promise<LuauRunResult> {
  return new Promise<LuauRunResult>((resolve) => {
    const id = ++nextId;
    let settled = false;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;
    let executionTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: LuauRunResult) => {
      if (settled) return;
      settled = true;
      pending.delete(id);
      if (startupTimer) clearTimeout(startupTimer);
      if (executionTimer) clearTimeout(executionTimer);
      resolve(result);
    };

    const startExecution = () => {
      if (settled || executionTimer) return;
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
      executionTimer = setTimeout(() => {
        worker?.terminate();
        worker = null;
        finish({
          output: "",
          error:
            "Execution timed out. This usually means your code has an infinite loop.",
          timedOut: true,
          elapsedMs: EXECUTION_TIMEOUT_MS,
        });
      }, EXECUTION_TIMEOUT_MS);
    };

    startupTimer = setTimeout(() => {
      worker?.terminate();
      worker = null;
      finish({
        output: "",
        error:
          "The code runner couldn't start. Check your connection and try again.",
        timedOut: false,
        engineFailure: true,
        elapsedMs: STARTUP_TIMEOUT_MS,
      });
    }, STARTUP_TIMEOUT_MS);

    pending.set(id, { finish, startExecution });

    try {
      getWorker().postMessage({ id, code });
    } catch (err) {
      finish({
        output: "",
        error: err instanceof Error ? err.message : String(err),
        timedOut: false,
        engineFailure: true,
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
