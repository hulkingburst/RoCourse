"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Play,
  RefreshCw,
  Square,
  Terminal,
} from "lucide-react";
import { runLuau, stopLuau } from "@/lib/luau-runtime";

interface Example {
  name: string;
  code: string;
}

const EXAMPLES: Example[] = [
  {
    name: "Hello world",
    code: `print("Hello from Luau!")`,
  },
  {
    name: "Variables",
    code: `local name = "Luau"
local coins = 12

coins = coins + 8
print(name .. " has " .. coins .. " coins")`,
  },
  {
    name: "Types",
    code: `local score: number = 10
local title: string = "RoCourse"
local tagline: string = \`Learn Luau\`

print(\`Score: {score}\`)
print(\`Welcome to {title}\`)
print(tagline)`,
  },
  {
    name: "Functions",
    code: `local function double(value)
    return value * 2
end

local function describe(name, level)
    return name .. " (level " .. level .. ")"
end

print(describe("Ada", double(3)))`,
  },
  {
    name: "Tables",
    code: `local player = {
    name = "Sam",
    inventory = { "sword", "shield", "potion" },
}

print("Name: " .. player.name)
print("Inventory:")
for _, item in ipairs(player.inventory) do
    print("  - " .. item)
end`,
  },
  {
    name: "String interpolation",
    code: `local name = "World"
local x = 42

print(\`Hello, {name}!\`)
print(\`The answer is {x}\`)`,
  },
  {
    name: "FizzBuzz",
    code: `for i = 1, 20 do
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
  },
];

const DEFAULT_CODE = EXAMPLES[0].code;

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
    setOutput(result.error ?? (result.output || "(no output)"));
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

  const loadExample = (example: Example) => {
    setCode(example.code);
    run(example.code);
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
          Luau Playground
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Write and run real Luau in your browser — sandboxed via WebAssembly,
          the same language you use in Roblox Studio. Code is saved in the URL,
          so you can share what you make.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example.name}
            type="button"
            onClick={() => loadExample(example)}
            className="rounded-full border border-input bg-transparent px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {example.name}
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
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={reset}
                aria-label="Reset code"
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
            aria-label="Luau code editor"
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
              Output
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
                  aria-label="Copy output"
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
                Run your code to see the output here.
              </span>
            )}
          </pre>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: press Ctrl/Cmd+Enter to run. Tab inserts two spaces. Runs are
        capped at a few seconds so an accidental infinite loop can&apos;t hang
        the page.
      </p>
      <p className="text-xs text-muted-foreground">
        Luau is MIT-licensed (Roblox Corporation; Lua.org, PUC-Rio) — see the
        attribution in the site README.
      </p>
    </div>
  );
}
