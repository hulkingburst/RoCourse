/**
 * Shared rules for user profile status text. Kept free of server-only imports
 * so the same limits are usable on the client (input UX) and the server (the
 * setStatus action is the real gatekeeper).
 */

/** Hard cap for profile status text — a short line, not a biography. */
export const STATUS_MAX_LENGTH = 80;

/**
 * Normalizes free-typed profile status text: strips control characters
 * (newlines, tabs, NUL bytes) and trims surrounding whitespace. Returns an
 * empty string when nothing meaningful remains — callers treat that as
 * "no status". The server action is the authoritative cleaner; this is a pure
 * helper so clients can preview the same normalization.
 */
export function cleanStatus(input: string): string {
  return input.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
}