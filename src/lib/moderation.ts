/**
 * Async moderation for public text on write paths. Layers PurgoMalum's
 * maintained profanity list on top of the local, synchronous rules in
 * `profanity.ts` (banned words — including the discriminatory terms PurgoMalum
 * can't be handed safely because it substring-matches — embedded emails, and
 * promotion links).
 *
 * PurgoMalum is GET-only and has no `add`-with-boundaries mode, so it is queried
 * with its own list and no custom words. Calls fail open: if the service is slow
 * or unreachable the local rules still apply and the text is allowed, rather
 * than blocking learners because a third party is down.
 */
import { prohibitedNameReason, type ProhibitedNameReason } from "@/lib/profanity";

const PURGOMALUM_ENDPOINT = "https://www.purgomalum.com/service/containsprofanity";
const TIMEOUT_MS = 2500;
// Bodies up to a few thousand characters are sent whole (the service handled
// 10k+ in testing); longer blobs are truncated so one request can't balloon.
const MAX_CHARS = 6000;

/**
 * Asks PurgoMalum whether `text` contains profanity. Returns null when the
 * service can't be reached, responds oddly, or times out, so callers can tell
 * "clean" apart from "unknown".
 */
export async function purgoMalumFlags(text: string): Promise<boolean | null> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const url = `${PURGOMALUM_ENDPOINT}?text=${encodeURIComponent(trimmed.slice(0, MAX_CHARS))}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "text/plain" },
    });
    if (!response.ok) return null;
    const body = (await response.text()).trim().toLowerCase();
    if (body === "true") return true;
    if (body === "false") return false;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Full gate for user-submitted public text: returns the first rule the text
 * trips, or null when it's acceptable. Never throws.
 */
export async function moderatePublicText(
  text: string
): Promise<ProhibitedNameReason | null> {
  const local = prohibitedNameReason(text);
  if (local) return local;
  if (await purgoMalumFlags(text)) return "badword";
  return null;
}
