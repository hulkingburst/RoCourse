"use client";

import * as React from "react";
import { Play, RefreshCw, Square, Terminal } from "lucide-react";
import { runLuau, stopLuau } from "@/lib/luau-runtime";
import { cn } from "@/lib/utils";

function insertTab(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
  event.preventDefault();
  const textarea = event.currentTarget;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value =
    textarea.value.slice(0, start) + "  " + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + 2;
}

/**
 * Collapsible inline Luau runner attached to a lesson code sample. Reuses the
 * same WASM worker as the playground, so any sample can be run, edited, and
 * re-run right where the learner is reading.
 */
export function TryIt({ code }: { code: string }) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(code);
  const [output, setOutput] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [elapsed, setElapsed] = React.useState<number | null>(null);
  const [running, setRunning] = React.useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    const result = await runLuau(value);
    setRunning(false);
    setElapsed(result.elapsedMs);
    setIsError(result.error !== null || result.timedOut);
    setOutput(result.error ?? (result.output || "(no output)"));
  };

  const stop = () => {
    stopLuau();
  };

  const reset = () => {
    setValue(code);
    setOutput(null);
    setIsError(false);
    setElapsed(null);
  };

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-4 py-2 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      >
        <Terminal className="h-3.5 w-3.5" />
        {open ? "Hide runner" : "Try it — run this code in your browser"}
      </button>

      {open && (
        <div className="grid gap-0 border-t border-white/10 sm:grid-cols-2">
          <div className="border-b border-white/10 sm:border-b-0 sm:border-r">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                main.luau
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (running ? stop() : run())}
                  disabled={!running && value.trim().length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {running ? (
                    <>
                      <Square className="h-3 w-3 fill-current" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> Run
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Reset code"
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  run();
                } else if (event.key === "Tab") {
                  insertTab(event);
                }
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Luau code editor"
              className="block h-52 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  output === null
                    ? "bg-zinc-600"
                    : isError
                      ? "bg-red-500"
                      : "bg-emerald-500"
                )}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Output
              </span>
              {elapsed !== null && (
                <span className="ml-auto text-[11px] text-zinc-500">
                  {(elapsed / 1000).toFixed(3)}s
                </span>
              )}
            </div>
            <pre
              className={cn(
                "flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed",
                isError ? "text-red-300" : "text-zinc-200"
              )}
            >
              {output ?? (
                <span className="text-zinc-600">Run the code to see output here.</span>
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
