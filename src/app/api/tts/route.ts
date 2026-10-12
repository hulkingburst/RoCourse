import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import {
  elevenLabsApiKey,
  narrationModelId,
  resolveNarrationVoiceId,
  synthesizeNarration,
  NarrationError,
} from "@/lib/elevenlabs";
import {
  findNarrationAudio,
  narrationCacheAvailable,
  narrationCacheKey,
  pruneNarrationCache,
  saveNarrationAudio,
} from "@/lib/narration-cache";
import {
  MAX_NARRATION_CHARS,
  MAX_NARRATION_INPUT_CHARS,
  toNarrationText,
} from "@/lib/narration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lesson narration for the Read Aloud button.
 *
 * The client posts the visible prose of the current lesson step; the route
 * preprocesses it (`toNarrationText`), looks up audio for the exact speech
 * text in the blob cache, and only calls ElevenLabs on a miss. A miss is the
 * only thing that costs credits.
 *
 * A cache hit is free and stays open to everyone, so any learner can replay
 * narration that already exists. A miss — the paid ElevenLabs call — requires a
 * signed-in account and is budgeted per account as well as per IP, so an
 * anonymous caller can't spend the project's quota. Signed-out readers lose
 * nothing: the client falls back to the browser voice.
 *
 * Every failure answers with a JSON error, which the client turns into the
 * browser-voice fallback — Read Aloud keeps working when narration has no API
 * key, the quota is spent, or ElevenLabs is down.
 */

// Budgets on generation only (cached audio is free to replay): a learner never
// hits them, while hammering the endpoint on uncached text can't drain the
// ElevenLabs quota.
const LIMIT_PER_IP = 60;
const LIMIT_PER_USER = 30;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `narration:${ip}`;
const userLimitKey = (userId: string) => `narration:user:${userId}`;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const text = (body as { text?: unknown })?.text;
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > MAX_NARRATION_INPUT_CHARS) {
    return NextResponse.json({ error: "Step is too long to narrate" }, { status: 413 });
  }

  const apiKey = elevenLabsApiKey();
  if (!apiKey || !narrationCacheAvailable()) {
    // Not configured yet: the client falls back to the browser voice.
    return NextResponse.json({ error: "Narration is not configured" }, { status: 503 });
  }

  const narration = toNarrationText(text);
  if (!narration) {
    return NextResponse.json({ error: "Nothing to narrate" }, { status: 400 });
  }
  if (narration.length > MAX_NARRATION_CHARS) {
    return NextResponse.json({ error: "Step is too long to narrate" }, { status: 413 });
  }

  try {
    const modelId = narrationModelId();
    const voiceId = await resolveNarrationVoiceId(apiKey);
    const key = narrationCacheKey(narration, voiceId, modelId);

    // A cache that can't answer is a miss, never a failed read: narration is
    // more important than the optimization it saves us.
    const cached = await findNarrationAudio(key).catch((error) => {
      console.error("[tts:cache]", error);
      return null;
    });
    if (cached) {
      return NextResponse.json({ url: cached, cached: true });
    }

    // Everything past this line can cost money, so it needs an account. The
    // session is only checked here, after the free cache lookup, so anonymous
    // readers keep hearing already-generated narration.
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to generate narration" },
        { status: 401 }
      );
    }

    const ip = trustedIp(request.headers);
    // The database may be unconfigured (local dev, previews): a broken guard
    // must not break narration, so it fails open and only logs.
    const limited = await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS).catch(
      (error) => {
        console.error("[tts:rate-limit]", error);
        return false;
      }
    );
    if (limited) {
      return NextResponse.json({ error: "Too many narration requests" }, { status: 429 });
    }
    const overUserBudget = await isRateLimited(
      userLimitKey(userId),
      LIMIT_PER_USER,
      LIMIT_WINDOW_MS
    ).catch((error) => {
      console.error("[tts:rate-limit]", error);
      return false;
    });
    if (overUserBudget) {
      return NextResponse.json({ error: "Too many narration requests" }, { status: 429 });
    }

    const audio = await synthesizeNarration(narration, { apiKey, voiceId, modelId });
    // A plan fallback (see elevenlabs.ts) speaks with the legacy id, so the
    // audio is stored under that voice's key — which is the key every later
    // request resolves to from then on.
    const storeKey =
      audio.voiceId === voiceId ? key : narrationCacheKey(narration, audio.voiceId, modelId);

    let url: string | null = null;
    try {
      url = await saveNarrationAudio(storeKey, audio.audio, audio.contentType);
    } catch (error) {
      // Storing failed (usually a stale or missing blob credential). The
      // learner still gets the narration — it just isn't cached for the next
      // play, so keep the failure out of the response and log it once here.
      console.error("[tts:cache]", error);
    }

    await recordRateLimit(limitKey(ip)).catch(() => {});
    await recordRateLimit(userLimitKey(userId)).catch(() => {});
    await pruneRateLimits().catch(() => {});
    // Retention for the cache this generation just wrote to. Throttled and
    // fire-and-forget: housekeeping must not slow down or fail a read-aloud.
    void pruneNarrationCache().catch((error) => console.error("[tts:cache]", error));

    if (url) return NextResponse.json({ url, cached: false });
    return new NextResponse(audio.audio, {
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": "private, max-age=0, no-store",
      },
    });
  } catch (error) {
    if (error instanceof NarrationError) {
      console.error("[tts]", error.status, error.detail || error.message);
      // Key, voice, or plan problem: an environment issue to fix, never
      // surfaced as an ElevenLabs detail to the learner.
      if (error.status === 401 || error.status === 402 || error.status === 403) {
        return NextResponse.json({ error: "Narration is not configured" }, { status: 503 });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: "Too many narration requests" }, { status: 429 });
      }
      if (error.status >= 400 && error.status < 500) {
        return NextResponse.json({ error: "Could not narrate this text" }, { status: 400 });
      }
      return NextResponse.json({ error: "Narration is temporarily unavailable" }, { status: 502 });
    }
    console.error("[tts]", error);
    return NextResponse.json({ error: "Narration is temporarily unavailable" }, { status: 502 });
  }
}
