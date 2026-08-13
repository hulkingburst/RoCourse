"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  Play,
  RefreshCw,
  Square,
  Terminal,
} from "lucide-react";
import { runLuau, stopLuau } from "@/lib/luau-runtime";

const EXAMPLE_KEYS = [
  "helloWorld",
  "variables",
  "types",
  "functions",
  "tables",
  "stringInterpolation",
  "fizzBuzz",
] as const;

type ExampleKey = (typeof EXAMPLE_KEYS)[number];

const EXAMPLES: Record<ExampleKey, string> = {
  helloWorld: `print("Hello from Luau!")`,
  variables: `local name = "Luau"
local coins = 12

coins = coins + 8
print(name .. " has " .. coins .. " coins")`,
  types: `local score: number = 10
local title: string = "RoCourse"
local tagline: string = \`Learn Luau\`

print(\`Score: {score}\`)
print(\`Welcome to {title}\`)
print(tagline)`,
  functions: `local function double(value)
    return value * 2
end

local function describe(name, level)
    return name .. " (level " .. level .. ")"
end

print(describe("Ada", double(3)))`,
  tables: `local player = {
    name = "Sam",
    inventory = { "sword", "shield", "potion" },
}

print("Name: " .. player.name)
print("Inventory:")
for _, item in ipairs(player.inventory) do
    print("  - " .. item)
end`,
  stringInterpolation: `local name = "World"
local x = 42

print(\`Hello, {name}!\`)
print(\`The answer is {x}\`)`,
  fizzBuzz: `for i = 1, 20 do
    if i % 15 == 0 then
        print("FizzBuzz")
    elseif i % 3 == 0 then
        print("Fizz")
    elseif i % 5 == 0 then
        print("Buzz")
    else
        print(i)
    end
end`,
};

const DEFAULT_CODE = EXAMPLES.helloWorld;

function readHash(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return null;
  }
}

function insertTab(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
  event.preventDefault();
  const textarea = event.currentTarget;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value =
    textarea.value.slice(0, start) + "  " + textarea.value.slice(end);
  textarea.selectionStart = textarea.selectionEnd = start + 2;
}

export function PlaygroundClient() {
  const t = useTranslations("playground");
  // The editor starts from the URL hash (client-only), so it loads lazily to
  // avoid hydration mismatches; `suppressHydrationWarning` covers the first
  // render where server and client can legitimately differ.
  const [code, setCode] = React.useState(
    () => readHash() ?? DEFAULT_CODE
  );
  const [output, setOutput] = React.useState<string | null>(null);
  const [isError, setIsError] = React.useState(false);
  const [elapsed, setElapsed] = React.useState<number | null>(null);
  const [running, setRunning] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const run = async (source = code) => {
    if (running) return;
    setRunning(true);
    setOutput(null);
    const result = await runLuau(source);
    setRunning(false);
    setElapsed(result.elapsedMs);
    setIsError(result.error !== null || result.timedOut);
    setOutput(result.error ?? (result.output || t("noOutput")));
    try {
      window.history.replaceState(
        null,
        "",
        "#" + encodeURIComponent(source)
      );
    } catch {
      // ignore: sharing is a nice-to-have
    }
  };

  const stop = () => {
    stopLuau();
  };

  const reset = () => {
    setCode(DEFAULT_CODE);
    setOutput(null);
    setIsError(false);
    setElapsed(null);
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      // ignore
    }
  };

  const loadExample = (key: ExampleKey) => {
    const code = EXAMPLES[key];
    setCode(code);
    run(code);
  };

  const copyOutput = async () => {
    if (output == null) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Terminal className="h-6 w-6 text-primary" />
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => loadExample(key)}
            className="rounded-full border border-input bg-transparent px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {t(`examples.${key}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              main.luau
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => (running ? stop() : run())}
                disabled={!running && code.trim().length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    {t("stop")}
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    {t("run")}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                aria-label={t("resetCode")}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
            aria-label={t("editor")}
            suppressHydrationWarning
            className="block h-[420px] w-full resize-none bg-transparent p-4 font-mono text-[13.5px] leading-relaxed text-zinc-200 outline-none"
          />
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-sm">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                output === null
                  ? "bg-zinc-600"
                  : isError
                    ? "bg-red-500"
                    : "bg-emerald-500"
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {t("output")}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {elapsed !== null && (
                <span className="text-[11px] text-zinc-500">
                  {(elapsed / 1000).toFixed(3)}s
                </span>
              )}
              {output !== null && (
                <button
                  type="button"
                  onClick={copyOutput}
                  className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                  aria-label={t("copyOutput")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>
          <pre
            className={`flex-1 overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed ${
              isError ? "text-red-300" : "text-zinc-200"
            }`}
          >
            {output ?? (
              <span className="text-zinc-600">
                {t("outputHint")}
              </span>
            )}
          </pre>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("tip")}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("attribution")}
      </p>
    </div>
  );
}
