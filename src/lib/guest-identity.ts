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

/** True when `token` is a live token this server issued for `guestId`. */
export function verifyGuestToken(
  guestId: string,
  token: unknown,
  now: number = Date.now()
): boolean {
  if (typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [prefix, rawExpires, signature] = parts;
  if (prefix !== TOKEN_PREFIX) return false;
  const expiresAt = Number(rawExpires);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return false;

  const expected = createHmac("sha256", tokenSecret())
    .update(`${TOKEN_PREFIX}:${guestId}:${expiresAt}`)
    .digest("hex");
  return timingSafeEqualHex(signature, expected);
}

/** Constant-time comparison of two hex signatures. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
