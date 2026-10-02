"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Pause, Play, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSpeakableCode, toNarrationText } from "@/lib/narration";

/**
 * Lesson narration — the Read Aloud button.
 *
 * One pipeline, two engines. The button extracts the visible prose of the
 * current step from the DOM (the existing lesson selection: code blocks,
 * activity controls, and page chrome never reach the voice), posts it to
 * `/api/tts`, and plays the audio URL that comes back — ElevenLabs'
 * "Caleb - Trusted Guide", preprocessed by `src/lib/narration.ts` and cached
 * as a blob so identical narration is never generated twice. If narration
 * isn't configured, the quota is spent, or the request fails, the same
 * narration text is spoken with the browser's built-in voice, which also uses
 * the shared preprocessing rules.
 *
 * Controls keep the existing footprint: one button that plays, pauses, and
 * resumes, plus a stop button that only appears while narration is active.
 */

/** Block elements that end a line (their children get a newline after). */
const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "DIV",
  "SECTION",
  "TR",
  "TH",
  "TD",
]);
/** Subtrees that should never be read (code blocks, chrome, interactive controls). */
const SKIP_TAGS = new Set([
  "PRE",
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
/** Headings, so the narration pass can tell them from prose. */
const HEADING_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);
/**
 * Marker that opts a subtree out of narration. Used for controls and labels
 * that live inside lesson content (an activity's title bar and status badge),
 * which would otherwise be read as if they were prose.
 */
const NARRATION_SKIP_ATTRIBUTE = "data-narration-skip";

/**
 * Walks a rendered lesson's content and returns its prose — the explanations,
 * headings, and list items — while skipping code blocks, buttons, and other
 * interactive widgets. Glossary-term words (dotted-underline terms with hover
 * popovers) ARE read, as plain words; only the popover definitions are
 * skipped. Line breaks are kept so the narration pass can punctuate each
 * paragraph, heading, and list item as its own sentence, and headings are
 * marked with "#" (never spoken) so they never gain a question mark.
 */
export function extractProseText(root: HTMLElement | null): string {
  if (!root) return "";
  const parts: string[] = [];

  const push = (text: string) => {
    parts.push(text);
  };
  const breakLine = () => {
    if (parts.length > 0 && parts[parts.length - 1] !== "\n") parts.push("\n");
  };

  /** Raw concatenated text of a subtree (no element filtering). */
  const rawText = (rootNode: Node): string => {
    if (rootNode.nodeType === Node.TEXT_NODE) return (rootNode.nodeValue ?? "").trim();
    if (rootNode.nodeType !== Node.ELEMENT_NODE) return "";
    return Array.from((rootNode as HTMLElement).childNodes).map(rawText).join(" ");
  };

  /**
   * Pushes inline (non-block) text of a subtree to `parts`, respecting the
   * same skip rules as the main walk: quiet for whole code blocks and activity
   * controls, spoken for glossary-term words, silent for heading "#" glyph
   * links. Inline code is spoken only when it reads as a term ("LocalPlayer");
   * real snippets stay silent for the learner to read.
   */
  const pushInline = (rootNode: Node): void => {
    const walk = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.nodeValue ?? "").trim();
        if (t) push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as HTMLElement;
      const tag = element.tagName;
      // Chrome that lives inside lesson markup opts out of narration.
      if (element.hasAttribute(NARRATION_SKIP_ATTRIBUTE)) return;
      if (tag === "CODE") {
        if (!element.closest("pre") && isSpeakableCode(element.textContent)) {
          for (const child of Array.from(element.childNodes)) walk(child);
        }
        return;
      }
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
      if (t) push(t);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName;
    // Chrome that lives inside lesson markup opts out of narration.
    if (element.hasAttribute(NARRATION_SKIP_ATTRIBUTE)) return;
    if (tag === "CODE") {
      if (!element.closest("pre") && isSpeakableCode(element.textContent)) {
        pushInline(element);
      }
      return;
    }
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
    // Headings keep a marker so the narration pass treats them as headings.
    if (HEADING_TAGS.has(tag)) {
      const before = parts.length;
      pushInline(element);
      if (parts.length > before) {
        parts.splice(before, 0, "#");
        breakLine();
      }
      return;
    }
    // Treat each list item as its own sentence: text is read in place, then a
    // period is tacked on so the narrative pauses at every bullet.
    if (tag === "LI") {
      const before = parts.length;
      pushInline(element);
      if (parts.length > before) {
        const lastIndex = parts.length - 1;
        const last = parts[lastIndex].replace(/[,;:]+$/, "");
        parts[lastIndex] = last;
        if (!/[.!?]$/.test(last)) push(".");
      }
      breakLine();
      return;
    }
    for (const child of Array.from(element.childNodes)) visit(child);
    if (BLOCK_TAGS.has(tag)) breakLine();
  };

  visit(root);
  return parts
    .join(" ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]+\./g, ".")
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

type NarrationStatus = "idle" | "loading" | "playing" | "paused" | "error";
type NarrationEngine = "cloud" | "browser" | null;

interface NarrationSession {
  audio: HTMLAudioElement | null;
  abort: AbortController;
  /** Object URL for uncached audio, revoked when this session ends. */
  objectUrl: string | null;
}

/** The narration currently owned by a button, if any. */
let session: NarrationSession | null = null;
/** Monotonic token: any stop or new read invalidates older async work. */
let epoch = 0;
const cancelListeners = new Set<() => void>();

/** Stops any currently playing narration, cloud or browser (safe to call even
 * when idle). Step changes call this so audio never outlives its lesson step. */
export function cancelSpeech(): void {
  epoch += 1;
  const active = session;
  session = null;
  if (active) {
    active.abort.abort();
    if (active.audio) {
      active.audio.pause();
      active.audio.removeAttribute("src");
    }
    if (active.objectUrl) URL.revokeObjectURL(active.objectUrl);
  }
  if (speechSupported()) window.speechSynthesis.cancel();
  if (active) for (const listener of cancelListeners) listener();
}

/**
 * ~20ms of silence as a WAV data URI. Strict browsers (iOS Safari) only allow
 * audio that was started inside the tap itself, so the button opens the audio
 * channel with this while the real narration is still being fetched.
 */
let silentWav: string | null = null;
function silentWavUrl(): string {
  if (silentWav) return silentWav;
  const samples = 160; // 20ms at 8kHz
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) bytes[offset + i] = text.charCodeAt(i);
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true); // sample rate
  view.setUint32(28, 8000, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit PCM silence
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  silentWav = `data:audio/wav;base64,${btoa(binary)}`;
  return silentWav;
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
  const [status, setStatus] = React.useState<NarrationStatus>("idle");
  const engineRef = React.useRef<NarrationEngine>(null);
  // Rendered only after hydration so SSR (null) and the first client render
  // agree; the button then appears a tick later, like the bookmark button.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Keep a live voice list in sync for the fallback — Chrome populates voices
  // asynchronously, so the list can be empty on the very first call.
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
      // Leaving the page ends narration and releases anything held for it.
      const leaving = session;
      session = null;
      if (leaving) {
        leaving.abort.abort();
        leaving.audio?.pause();
        if (leaving.objectUrl) URL.revokeObjectURL(leaving.objectUrl);
      }
    };
  }, []);

  // An external stop (the learner moved to another step) mirrors here.
  React.useEffect(() => {
    const onCancel = () => {
      engineRef.current = null;
      setStatus("idle");
    };
    cancelListeners.add(onCancel);
    return () => {
      cancelListeners.delete(onCancel);
    };
  }, []);

  // The error state clears itself, so the button never looks permanently
  // broken after a one-off failure.
  React.useEffect(() => {
    if (status !== "error") return;
    const id = window.setTimeout(() => setStatus("idle"), 4000);
    return () => window.clearTimeout(id);
  }, [status]);

  // Safety net for the browser voice: if it stops on its own (tab switch,
  // etc.), reflect that in the button state.
  React.useEffect(() => {
    if (!speechSupported()) return;
    const synth = window.speechSynthesis;
    const sync = () => {
      if (engineRef.current !== "browser") return;
      if (synth.speaking || synth.pending || synth.paused) return;
      engineRef.current = null;
      session = null;
      setStatus("idle");
    };
    const id = window.setInterval(sync, 500);
    return () => window.clearInterval(id);
  }, []);

  const speakWithBrowser = React.useCallback(
    (text: string, onDone: () => void): boolean => {
      if (!speechSupported()) return false;
      const synth = window.speechSynthesis;
      synth.cancel();
      // The same preprocessing rules as the cloud path, so a fallback read
      // still says "gee-you-eye" and still pauses at every sentence.
      const utterance = new SpeechSynthesisUtterance(toNarrationText(text));
      utterance.lang = locale;
      const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
      const voice = pickVoice(locale, voices);
      if (voice) utterance.voice = voice;
      utterance.onend = onDone;
      utterance.onerror = onDone;
      engineRef.current = "browser";
      synth.speak(utterance);
      return true;
    },
    [locale]
  );

  const stop = React.useCallback(() => {
    cancelSpeech();
    engineRef.current = null;
    setStatus("idle");
  }, []);

  const play = React.useCallback(async () => {
    const prose = getText().trim();
    if (!prose) return;

    // A fresh read, so end anything already playing (another lesson, preview).
    cancelSpeech();
    const myEpoch = ++epoch;
    const mySession: NarrationSession = {
      audio: null,
      abort: new AbortController(),
      objectUrl: null,
    };
    session = mySession;
    engineRef.current = "cloud";
    setStatus("loading");

    // Open the audio channel inside the tap itself (see silentWavUrl).
    const unlock = new Audio(silentWavUrl());
    unlock.volume = 0;
    void unlock.play().catch(() => {});

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prose }),
        signal: mySession.abort.signal,
      });
      // The route answers with a cached audio URL, or with the audio bytes
      // themselves when the store couldn't take them (a stale blob token, a
      // local dev without one) — either way the learner hears narration.
      const contentType = response.headers.get("content-type") ?? "";
      let source = "";
      if (contentType.includes("audio/")) {
        const objectUrl = URL.createObjectURL(await response.blob());
        if (myEpoch !== epoch) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        mySession.objectUrl = objectUrl;
        source = objectUrl;
      } else {
        const payload = (await response.json().catch(() => null)) as { url?: string } | null;
        if (!response.ok || !payload?.url) {
          throw new Error(`narration unavailable (${response.status})`);
        }
        source = payload.url;
      }
      if (myEpoch !== epoch) return;

      const audio = new Audio(source);
      audio.preload = "auto";
      mySession.audio = audio;
      audio.addEventListener("ended", () => {
        if (myEpoch !== epoch) return;
        if (mySession.objectUrl) URL.revokeObjectURL(mySession.objectUrl);
        session = null;
        engineRef.current = null;
        setStatus("idle");
      });
      await audio.play();
      if (myEpoch !== epoch) {
        audio.pause();
        return;
      }
      setStatus("playing");
    } catch (error) {
      if (myEpoch !== epoch) return;
      if (mySession.objectUrl) URL.revokeObjectURL(mySession.objectUrl);
      if (session === mySession) session = null;
      // No key, spent quota, offline, blocked playback: the browser voice
      // keeps Read Aloud working.
      const fellBack = speakWithBrowser(prose, () => {
        if (myEpoch !== epoch) return;
        session = null;
        engineRef.current = null;
        setStatus("idle");
      });
      if (fellBack) {
        setStatus("playing");
        return;
      }
      console.warn("[read-aloud]", error);
      engineRef.current = null;
      setStatus("error");
    }
  }, [getText, speakWithBrowser]);

  const pause = React.useCallback(() => {
    if (engineRef.current === "browser" && speechSupported()) {
      window.speechSynthesis.pause();
      setStatus("paused");
      return;
    }
    session?.audio?.pause();
    setStatus("paused");
  }, []);

  const resume = React.useCallback(() => {
    if (engineRef.current === "browser" && speechSupported()) {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }
    const audio = session?.audio;
    if (!audio) {
      setStatus("idle");
      return;
    }
    void audio.play().catch(() => setStatus("error"));
    setStatus("playing");
  }, []);

  const primary = React.useCallback(() => {
    if (status === "loading") {
      stop();
      return;
    }
    if (status === "playing") {
      pause();
      return;
    }
    if (status === "paused") {
      resume();
      return;
    }
    void play();
  }, [status, stop, pause, resume, play]);

  if (!mounted) return null;

  const active = status === "loading" || status === "playing" || status === "paused";
  const label =
    status === "loading"
      ? t("narrationLoading")
      : status === "playing"
        ? t("pauseReading")
        : status === "paused"
          ? t("resumeReading")
          : status === "error"
            ? t("narrationError")
            : t("readAloud");

  const icon =
    status === "loading" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : status === "playing" ? (
      <Pause className="h-4 w-4" />
    ) : status === "paused" ? (
      <Play className="h-4 w-4" />
    ) : (
      <Volume2 className="h-4 w-4" />
    );

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={primary}
        aria-label={label}
        title={label}
        aria-pressed={active}
        className={cn(
          "shrink-0 rounded-lg border p-2 transition-all duration-200 motion-reduce:transition-none active:scale-90 hover:scale-105",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : status === "error"
              ? "border-destructive/40 text-destructive"
              : "text-muted-foreground hover:bg-accent"
        )}
      >
        {icon}
      </button>
      {active && (
        <button
          type="button"
          onClick={stop}
          aria-label={t("stopReading")}
          title={t("stopReading")}
          className="shrink-0 rounded-lg border p-2 text-muted-foreground transition-all duration-200 motion-reduce:transition-none active:scale-90 hover:scale-105 hover:bg-accent"
        >
          <Square className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
