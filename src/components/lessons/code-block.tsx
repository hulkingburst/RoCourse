"use client";

import * as React from "react";
import { Check, Copy, Play, Terminal } from "lucide-react";
import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";
import { TryIt } from "@/components/lessons/try-it";

function extractText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return props && "children" in props ? extractText(props.children) : "";
  }
  return "";
}

function languageLabel(language: string): string {
  const map: Record<string, string> = {
    luau: "Luau",
    lua: "Lua",
    typescript: "TypeScript",
    javascript: "JavaScript",
    tsx: "TSX",
    json: "JSON",
    css: "CSS",
    html: "HTML",
    bash: "Terminal",
    diff: "Diff",
    markdown: "Markdown",
    mdx: "MDX",
    text: "Text",
  };
  return map[language] ?? language.toUpperCase();
}

/**
 * `pre` override used by the MDX renderer. Receives the `<code>` element as
 * children and renders it with Shiki syntax highlighting plus a copy button.
 */
export function CodeBlock({
  children,
  className,
}: React.HTMLAttributes<HTMLPreElement>) {
  const codeElement = React.isValidElement(children) ? children : null;
  const codeProps = codeElement?.props as
    | { className?: string; children?: React.ReactNode }
    | undefined;

  const rawClassName = codeProps?.className ?? "";
  const language = rawClassName.replace(/^language-/, "").split(/\s+/)[0] ?? "";
  const code = extractText(codeProps?.children);
  const runnable = language === "luau" || language === "lua";
  const highlightKey = `${language}\u0000${code}`;
  const [highlight, setHighlight] = React.useState<{
    key: string;
    value: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [trying, setTrying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    highlightCode(code, language).then((result) => {
      if (!cancelled) setHighlight({ key: highlightKey, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [code, language, highlightKey]);

  const html = highlight?.key === highlightKey ? highlight.value : null;

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; ignore.
    }
  }, [code]);

  return (
    <div
      className={cn(
        "codeblock group relative my-6 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-sm",
        className
      )}
    >
      <div className="flex h-9 items-center justify-between border-b border-white/10 px-4">
        <span className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
          <Terminal className="h-3.5 w-3.5" />
          {language ? languageLabel(language) : "Code"}
        </span>
        <div className="flex items-center gap-1">
          {runnable && (
            <button
              type="button"
              onClick={() => setTrying(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
              aria-label="Run this code"
            >
              <Play className="h-3.5 w-3.5" /> Try it
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </button>
        </div>
      </div>
      {html ? (
        <div
          className="overflow-x-auto p-4 text-[13.5px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="p-4 text-[13.5px] leading-relaxed text-zinc-300">
          <code>{code}</code>
        </pre>
      )}
      {trying && <TryIt code={code} />}
    </div>
  );
}
