/**
 * ElevenLabs client for lesson narration — server-only.
 *
 * The Read Aloud button posts lesson text to `/api/tts`, which calls this
 * client and returns a cached audio URL. The API key lives in the server
 * environment (`ELEVENLABS_API_KEY`) and is never exposed to the browser.
 *
 * Voice: "Caleb - Trusted Guide", ElevenLabs' default voice that replaced the
 * older "Chris" — a clear, friendly, natural teacher voice. The account's
 * voice list is searched by name once per instance, so whichever id the
 * account has for Caleb is used; `ELEVENLABS_VOICE_ID` pins one explicitly,
 * and the classic default id is the last resort. The variables are listed in
 * `docs/migration-cloudflare.md` (environment matrix).
 */

const API_BASE = "https://api.elevenlabs.io/v1";

/** Classic default id for "Caleb - Trusted Guide" (the legacy "Chris" voice). */
export const DEFAULT_VOICE_ID = "iP95p4xoKVk53GoZ742B";

/** Multilingual model: reads both the English and Spanish lessons naturally. */
export const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

/** Name fragment used to find the voice in the account's voice list. */
const VOICE_NAME_MATCH = "caleb";

/** Requests a synthesis of at most a few thousand characters. */
const SYNTH_TIMEOUT_MS = 45_000;

const VOICE_LOOKUP_TIMEOUT_MS = 5_000;

export class NarrationError extends Error {
  /** Provider status, mapped to a response by the TTS route. */
  readonly status: number;
  /** Provider detail, logged server-side only — never sent to the client. */
  readonly detail: string;

  constructor(message: string, status: number, detail = "") {
    super(message);
    this.name = "NarrationError";
    this.status = status;
    this.detail = detail;
  }
}

/** Configured ElevenLabs key, or null when narration isn't set up yet. */
export function elevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  return key ? key : null;
}

/** Model id for narration (overridable for voice experiments). */
export function narrationModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
}

/** Per-instance memory of the resolved voice, so lookups happen at most once. */
let resolvedVoiceId: string | null = null;

/**
 * Set once the provider tells us the chosen voice needs a paid plan. Free
 * accounts can still speak with the same voice under its legacy id (that id is
 * what ElevenLabs' own migration table pairs with "Caleb - Trusted Guide"),
 * so later requests resolve straight to it instead of paying for a doomed
 * request first.
 */
let planFallbackVoiceId: string | null = null;

/** The legacy id narration fell back to, or null when the chosen voice works. */
export function narrationVoiceFallbackId(): string | null {
  return planFallbackVoiceId;
}

/**
 * The voice id to synthesize with: an explicit `ELEVENLABS_VOICE_ID` wins,
 * otherwise the account's voice list is searched for Caleb, otherwise the
 * classic default id is used (which the API will reject with a clear error if
 * the account never had it).
 */
export async function resolveNarrationVoiceId(apiKey: string): Promise<string> {
  if (planFallbackVoiceId) return planFallbackVoiceId;
  const pinned = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (pinned) return pinned;
  if (resolvedVoiceId) return resolvedVoiceId;

  try {
    const response = await fetch(`${API_BASE}/voices?page_size=100`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(VOICE_LOOKUP_TIMEOUT_MS),
    });
    if (response.ok) {
      const payload = (await response.json()) as {
        voices?: Array<{ voice_id?: string; name?: string }>;
      };
      const voices = payload.voices ?? [];
      const matches = voices.filter((voice) =>
        String(voice.name ?? "").toLowerCase().includes(VOICE_NAME_MATCH)
      );
      const chosen =
        matches.find((voice) =>
          String(voice.name ?? "").toLowerCase().includes("trusted guide")
        ) ?? matches[0];
      if (chosen?.voice_id) {
        resolvedVoiceId = chosen.voice_id;
        return chosen.voice_id;
      }
    }
  } catch {
    // Network hiccup while listing voices: fall through to the default id.
  }

  return DEFAULT_VOICE_ID;
}

/**
 * Voice settings tuned for a teacher: steady but expressive, close to the
 * recorded voice, with the speaker boost that keeps narration crisp.
 */
const VOICE_SETTINGS = {
  stability: 0.45,
  similarity_boost: 0.75,
  style: 0.2,
  use_speaker_boost: true,
} as const;

export interface SynthesizedNarration {
  audio: ArrayBuffer;
  contentType: string;
  /** Voice actually used — the legacy id when a plan fallback happened. */
  voiceId: string;
}

/** Voice ids that only exist on a paid plan but have a usable legacy id. */
const PLAN_FALLBACK_STATUSES = new Set([402, 403, 404]);

function planFallbackVoice(error: unknown, requested: string): string | null {
  if (!(error instanceof NarrationError)) return null;
  if (!PLAN_FALLBACK_STATUSES.has(error.status)) return null;
  if (requested === DEFAULT_VOICE_ID) return null;
  return DEFAULT_VOICE_ID;
}

/**
 * Synthesizes narration text (already preprocessed by `toNarrationText`).
 * Throws `NarrationError` with the provider status so the route can map it to
 * a response and the client can fall back to the browser voice.
 *
 * If the chosen voice is refused because the account's plan doesn't include
 * it, the same voice is retried under its legacy id (see `DEFAULT_VOICE_ID`)
 * and the id is remembered, so a free account narrates instead of failing.
 */
export async function synthesizeNarration(
  text: string,
  options: { apiKey: string; voiceId: string; modelId: string }
): Promise<SynthesizedNarration> {
  const requested = options.voiceId;
  try {
    const result = await requestSpeech(text, options);
    return { ...result, voiceId: requested };
  } catch (error) {
    const fallback = planFallbackVoice(error, requested);
    if (!fallback) throw error;
    console.warn(
      `[narration] voice ${requested} needs a paid plan (${(error as NarrationError).status}); using the legacy id ${fallback}`
    );
    planFallbackVoiceId = fallback;
    const result = await requestSpeech(text, { ...options, voiceId: fallback });
    return { ...result, voiceId: fallback };
  }
}

/** One provider request; shared by the primary attempt and the fallback. */
async function requestSpeech(
  text: string,
  options: { apiKey: string; voiceId: string; modelId: string }
): Promise<Omit<SynthesizedNarration, "voiceId">> {
  const url = `${API_BASE}/text-to-speech/${encodeURIComponent(options.voiceId)}?output_format=mp3_44100_128`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": options.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId,
        voice_settings: VOICE_SETTINGS,
      }),
      signal: AbortSignal.timeout(SYNTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new NarrationError(
      "ElevenLabs request failed",
      504,
      error instanceof Error ? error.message : String(error)
    );
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new NarrationError(`ElevenLabs returned ${response.status}`, response.status, detail);
  }

  return {
    audio: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
  };
}
