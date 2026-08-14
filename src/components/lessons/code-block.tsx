"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Play, Terminal } from "lucide-react";
import { highlightCode } from "@/lib/highlighter";
import { cn } from "@/lib/utils";
import { TryIt } from "@/components/lessons/try-it";

interface LazyNode {
  $$typeof: symbol;
  _init: (payload: unknown) => unknown;
  _payload: unknown;
}

/**
 * React flight may serialize an element passed to a client component as a
 * `React.lazy` node instead of a plain element. Resolve it when the chunk is
 * already loaded; leave it untouched when still pending so the renderer can
 * resolve it while rendering.
 */
function resolveNode(node: React.ReactNode): React.ReactNode {
  if (node != null && typeof node === "object") {
    const candidate = node as unknown as Partial<LazyNode>;
    if (
      candidate.$$typeof === Symbol.for("react.lazy") &&
      typeof candidate._init === "function"
    ) {
      try {
        return resolveNode(candidate._init(candidate._payload) as React.ReactNode);
      } catch {
        return node;
      }
    }
  }
  return node;
}

function extractText(node: React.ReactNode): string {
  node = resolveNode(node);
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
  const t = useTranslations("codeBlock");
  const resolvedChildren = resolveNode(children);
  const codeElement = React.isValidElement(resolvedChildren)
    ? (resolvedChildren as React.ReactElement)
    : null;
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
          {language ? languageLabel(language) : t("code")}
        </span>
        <div className="flex items-center gap-1">
          {runnable && (
            <button
              type="button"
              onClick={() => setTrying(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
              aria-label={t("runThisCode")}
            >
              <Play className="h-3.5 w-3.5" /> {t("tryIt")}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
            aria-label={t("copyCode")}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> {t("copied")}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> {t("copy")}
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
          <code>{code !== "" ? code : children}</code>
        </pre>
      )}
      {trying && <TryIt code={code} />}
    </div>
  );
}
