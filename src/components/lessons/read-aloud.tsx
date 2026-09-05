"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Free text-to-speech via the browser's built-in Web Speech API — no server,
 * no API key, no network cost. Picks a voice that matches the active locale
 * (e.g. an English or Spanish OS voice) and falls back to the browser's
 * default when none match. Used to read a lesson's contents aloud.
 */

/** Block elements that end a sentence (their children get a newline after). */
const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "DIV", "SECTION", "TR"]);
/** Subtrees that should never be read (code, chrome, interactive controls). */
const SKIP_TAGS = new Set([
  "PRE",
  "CODE",
  "SCRIPT",
  "STYLE",
  "BUTTON",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "AUDIO",
  "VIDEO",
  "CANVAS",
  "SVG",
  "NAV",
]);

/**
 * Walks a rendered lesson's content and returns its prose — the explanations,
 * headings, and list items — while skipping code blocks, buttons, and other
 * interactive widgets. Glossary-term words (dotted-underline terms with hover
 * popovers) ARE read, as plain words; only the popover definitions are
 * skipped. This is the text a "read the lesson" button speaks.
 */
export function extractProseText(root: HTMLElement | null): string {
  if (!root) return "";
  const parts: string[] = [];

  /** Raw concatenated text of a subtree (no element filtering). */
  const rawText = (rootNode: Node): string => {
    if (rootNode.nodeType === Node.TEXT_NODE) return (rootNode.nodeValue ?? "").trim();
    if (rootNode.nodeType !== Node.ELEMENT_NODE) return "";
    return Array.from((rootNode as HTMLElement).childNodes).map(rawText).join(" ");
  };

  /**
   * Pushes inline (non-block) text of a subtree to `parts`, respecting the
   * same skip rules as the main walk: quiet for code and activity controls,
   * spoken for glossary-term words, and silent for heading "#" glyph links.
   */
  const pushInline = (rootNode: Node): void => {
    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.nodeValue ?? "").trim();
        if (t) parts.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as HTMLElement;
      const tag = element.tagName;
      if (SKIP_TAGS.has(tag)) {
        // Glossary-term triggers are buttons, but they hold a readable word —
        // descend into their children rather than re-processing the button.
        if (tag === "BUTTON" && element.hasAttribute("data-glossary-term")) {
          for (const child of Array.from(element.childNodes)) walk(child);
        }
        return;
      }
      if (tag === "A" && rawText(element).trim() === "#") return;
      for (const child of Array.from(element.childNodes)) walk(child);
    };
    walk(rootNode);
  };

  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.nodeValue ?? "").trim();
      if (t) parts.push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName;
    if (SKIP_TAGS.has(tag)) {
      // Glossary-term triggers are buttons, but they hold a readable word —
      // they're the dotted-underline term itself (the popover is separate).
      if (tag === "BUTTON" && element.hasAttribute("data-glossary-term")) {
        pushInline(element);
      }
      return;
    }
    // Skip headings' hidden "#" anchor glyphs (the "link to heading" marker).
    if (tag === "A" && rawText(element).trim() === "#") return;
    // Treat each list item as its own sentence: text is read in place, then a
    // period is tacked on so the narrative pauses at every bullet.
    if (tag === "LI") {
      const before = parts.length;
      pushInline(element);
      if (parts.length > before) {
        const lastIndex = parts.length - 1;
        const last = parts[lastIndex].replace(/[,;:]+$/, "");
        parts[lastIndex] = last;
        if (!/[.!?]$/.test(last)) parts.push(".");
      }
      return;
    }
    for (const child of Array.from(element.childNodes)) visit(child);
    if (BLOCK_TAGS.has(tag)) parts.push("\n");
  };

  visit(root);
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function pickVoice(lang: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const target = lang.toLowerCase();
  const prefix = target.split("-")[0];
  return (
    voices.find((voice) => voice.lang.toLowerCase() === target) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${prefix}-`)) ??
    voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === prefix) ??
    null
  );
}

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Stops any currently playing narration (safe to call even when idle). */
export function cancelSpeech(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function ReadAloudButton({
  getText,
  className,
}: {
  /** Returns the text to speak when the button is pressed. */
  getText: () => string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("lesson");
  const [speaking, setSpeaking] = React.useState(false);
  // Rendered only after hydration so SSR (null) and the first client render
  // agree; the button then appears a tick later, like the bookmark button.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Keep a live voice list in sync — Chrome populates voices asynchronously,
  // so the list can be empty on the very first call.
  const voicesRef = React.useRef<SpeechSynthesisVoice[]>([]);
  React.useEffect(() => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    const refresh = () => {
      voicesRef.current = synth.getVoices();
    };
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    return () => {
      synth.removeEventListener("voiceschanged", refresh);
      synth.cancel();
    };
  }, []);

  const stop = React.useCallback(() => {
    if (speechSupported()) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const toggle = React.useCallback(() => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;

    if (speaking) {
      stop();
      return;
    }

    const content = getText().trim();
    if (!content) return;

    // A fresh read, so end anything already playing (another lesson, preview).
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = locale;
    const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
    const voice = pickVoice(locale, voices);
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utterance.onpause = () => setSpeaking(false);

    synth.speak(utterance);
    setSpeaking(true);
  }, [speaking, getText, locale, stop]);

  // Safety net: if the browser stops speaking on its own (tab switch, etc.),
  // reflect that in the button state.
  React.useEffect(() => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    const sync = () => setSpeaking(synth.speaking);
    const id = window.setInterval(sync, 500);
    return () => window.clearInterval(id);
  }, [mounted]);

  if (!speechSupported() || !mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? t("stopReading") : t("readAloud")}
      aria-pressed={speaking}
      className={cn(
        "shrink-0 rounded-lg border p-2 transition-all duration-200 motion-reduce:transition-none active:scale-90 hover:scale-105",
        speaking
          ? "border-primary/40 bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent",
        className
      )}
    >
      {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}