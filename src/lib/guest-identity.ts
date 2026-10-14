import { createHmac, randomUUID } from "node:crypto";

/**
 * Guest identities for the weekly leaderboard.
 *
 * Guests have no account, so the board used to accept any client-chosen id —
 * which meant one machine could mint a board's worth of learners in an hour.
 * An identity is now issued by the server and signed, and a post is only
 * accepted for an identity that carries a live token. Minting a learner costs
 * one issuance from a budget far tighter than the posting one, so the abuse
 * ceiling is the issuance rate rather than the post rate, while a real device
 * caches its token and asks for a new one once a day.
 */

/** Ids are URLs-safe because they travel in a query string and into the DB. */
export const GUEST_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** Token format: `g1.<expiresAtMs>.<hmac>`. */
const TOKEN_PREFIX = "g1";
/** How long an issued identity stays valid. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
/** Bound on a presented token, so nothing huge is ever parsed or hashed. */
const MAX_TOKEN_LENGTH = 200;

let fallbackSecret: string | null = null;

/**
 * HMAC key for guest tokens: the deployment's own auth secret, so nothing new
 * has to be provisioned or kept in sync. Without one (a local dev run with no
 * auth configured) a per-process random key is used instead — tokens then stop
 * working across a restart, but they still cannot be forged.
 */
function tokenSecret(): string {
  const configured = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured) return configured;
  fallbackSecret ??= `${randomUUID()}${randomUUID()}`;
  return fallbackSecret;
}

/** A fresh, server-generated anonymous identity. */
export function newGuestId(): string {
  return randomUUID();
}

/** Issues a signed, expiring token for a guest id. */
export function issueGuestToken(guestId: string, now: number = Date.now()): string {
  const expiresAt = now + TOKEN_TTL_MS;
  const signature = createHmac("sha256", tokenSecret())
    .update(`${TOKEN_PREFIX}:${guestId}:${expiresAt}`)
    .digest("hex");
  return `${TOKEN_PREFIX}.${expiresAt}.${signature}`;
}

/**
 * The expiry of a token this server issued for `guestId`, or null when it is
 * not one of ours — missing, malformed, or signed with a different key. The
 * expiry is reported rather than judged, so each caller decides whether an
 * aged-out token still counts for what it is asking.
 */
function guestTokenExpiry(guestId: string, token: unknown): number | null {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [prefix, rawExpires, signature] = parts;
  if (prefix !== TOKEN_PREFIX) return null;
  const expiresAt = Number(rawExpires);
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) return null;

  const expected = createHmac("sha256", tokenSecret())
    .update(`${TOKEN_PREFIX}:${guestId}:${expiresAt}`)
    .digest("hex");
  return timingSafeEqualHex(signature, expected) ? expiresAt : null;
}

/** True when `token` is a live token this server issued for `guestId`. */
export function verifyGuestToken(
  guestId: string,
  token: unknown,
  now: number = Date.now()
): boolean {
  const expiresAt = guestTokenExpiry(guestId, token);
  return expiresAt !== null && expiresAt > now;
}

/**
 * True when `token` is a token this server issued for `guestId`, expired or
 * not.
 *
 * A stale token still proves the device was handed that identity: only a
 * caller that received the token can reproduce its signature, because the HMAC
 * key never leaves the server. That is what lets a returning device keep the
 * same board row after its token has aged out, while a caller that merely
 * *names* a live id — the hijack this guards against — still cannot.
 */
export function guestTokenOwnsId(guestId: string, token: unknown): boolean {
  return guestTokenExpiry(guestId, token) !== null;
}

/**
 * The guest id a caller has proven it owns, or null. `requested` must be a
 * well-formed id and `token` a token this server issued for that exact id (an
 * expired one is enough — see `guestTokenOwnsId`). Everything the server does
 * on behalf of a guest id goes through this, so no endpoint acts on an id that
 * was only asserted.
 */
export function provenGuestId(requested: unknown, token: unknown): string | null {
  if (typeof requested !== "string" || !GUEST_ID_RE.test(requested)) return null;
  return guestTokenOwnsId(requested, token) ? requested : null;
}

/** Constant-time comparison of two hex signatures. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
