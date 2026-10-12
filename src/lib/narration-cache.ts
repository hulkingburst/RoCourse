import { createHash } from "node:crypto";
import { del, list, put } from "@vercel/blob";

/**
 * Audio cache for lesson narration.
 *
 * The generated MP3 lives in the project's existing Vercel Blob store (the
 * same one resource uploads use — no second storage system) under a key that
 * is a SHA-256 of the *speech text* plus the voice and model. Two consequences
 * the spec asks for fall out of that:
 *
 *  - the same narration is never sent to ElevenLabs twice, no matter how many
 *    learners press Read Aloud;
 *  - changing the words a learner hears (lesson edit, pronunciation table,
 *    different voice) changes the hash, so the audio regenerates by itself,
 *    while a purely visual edit that narrates identically reuses the audio.
 *
 * Cached audio is immutable: the key only ever maps to one performance, so it
 * is stored with a one-year cache lifetime and `addRandomSuffix: false`, which
 * keeps the pathname derivable from the hash alone.
 */

const CACHE_PREFIX = "tts";

/**
 * Credentials are the store's own: a read-write token (Vercel Blob uploads,
 * Cloudflare), or Vercel's OIDC token with a store id. Nothing is passed to
 * the SDK explicitly, so it decides between them exactly as uploads do —
 * passing a token ourselves would make it ignore a working OIDC session.
 */
export function narrationCacheAvailable(): boolean {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim() && process.env.BLOB_STORE_ID?.trim();
  return Boolean(token || oidc);
}

/** Stable cache key for one narration performance. */
export function narrationCacheKey(
  narrationText: string,
  voiceId: string,
  modelId: string
): string {
  return createHash("sha256")
    .update(`${voiceId}\n${modelId}\n${narrationText}`)
    .digest("hex");
}

function cachePathname(key: string): string {
  return `${CACHE_PREFIX}/${key}.mp3`;
}

/**
 * URL of the cached audio for `key`, or null when it has never been generated.
 * The store is queried with the hash as a prefix, so the lookup stays O(1)
 * regardless of how many resources and narrations the store holds.
 */
export async function findNarrationAudio(key: string): Promise<string | null> {
  const pathname = cachePathname(key);
  const result = await list({ prefix: pathname, limit: 1 });
  const match = result.blobs.find((blob) => blob.pathname === pathname);
  return match?.url ?? null;
}

/** Stores freshly generated narration audio and returns its public URL. */
export async function saveNarrationAudio(
  key: string,
  audio: ArrayBuffer,
  contentType: string
): Promise<string> {
  const result = await put(cachePathname(key), audio, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return result.url;
}

/**
 * How long cached audio is kept. Long enough that a lesson edit re-uploads
 * rather than regenerates, bounded so the public store can't grow forever.
 */
const CACHE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
/** At most one retention pass per process per hour. */
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
let lastPruneAt = 0;

/** True when a retention pass is due — lets callers avoid scheduling a no-op. */
export function narrationPruneDue(now: number = Date.now()): boolean {
  return now - lastPruneAt >= PRUNE_INTERVAL_MS;
}

/**
 * Retention for cached narration: audio older than the window is deleted.
 *
 * Every generation writes an immutable object that nothing else ever removes,
 * so without this the store grows for the lifetime of the deployment. One page
 * per pass keeps the work bounded, and the hour throttle keeps it off the hot
 * path; a replayed lesson simply regenerates the audio once, which is also how
 * an expired pronunciation is refreshed. Failures are the caller's to swallow —
 * housekeeping must never affect a learner's request.
 */
export async function pruneNarrationCache(now: number = Date.now()): Promise<void> {
  if (!narrationPruneDue(now)) return;
  lastPruneAt = now;
  const result = await list({ prefix: `${CACHE_PREFIX}/`, limit: 1000 });
  const stale = result.blobs.filter(
    (blob) => now - new Date(blob.uploadedAt).getTime() > CACHE_MAX_AGE_MS
  );
  if (stale.length === 0) return;
  await del(stale.map((blob) => blob.url));
}
