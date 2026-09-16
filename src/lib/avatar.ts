/**
 * Default profile pictures.
 *
 * The site never stores uploaded images or external URLs — a user's avatar is
 * a single option id (e.g. "adventurer-neutral:avatar_02"), where each option
 * pairs one of DiceBear's "neutral" collection styles with a deterministic
 * seed. Rendering always goes through `getAvatarUrl`, so an invalid or unknown
 * id yields no avatar (the UI falls back to its standard no-avatar state)
 * instead of a broken or user-controlled image.
 */

const DICEBEAR_VERSION = "10.x";

/** Every DiceBear style in the neutral family. */
const NEUTRAL_STYLES = [
  "avataaars-neutral",
  "adventurer-neutral",
  "lorelei-neutral",
  "bottts-neutral",
  "big-ears-neutral",
  "croodles-neutral",
  "notionists-neutral",
  "pixel-art-neutral",
] as const;

/**
 * Deterministic seeds shown for each style. Seed strings are zero-padded
 * (avatar_01..avatar_24) so old persisted ids keep resolving.
 */
const SEED_COUNT = 24;

const seedForIndex = (index: number) =>
  `avatar_${String(index + 1).padStart(2, "0")}`;

export interface AvatarOption {
  /** The value persisted on the user. Nothing else is ever accepted. */
  id: string;
  style: (typeof NEUTRAL_STYLES)[number];
  seed: string;
}

/** Every neutral image in every neutral collection: styles × seeds. */
export const AVATAR_OPTIONS: readonly AvatarOption[] = NEUTRAL_STYLES.flatMap(
  (style) =>
    Array.from({ length: SEED_COUNT }, (_, index) => {
      const seed = seedForIndex(index);
      return { id: `${style}:${seed}`, style, seed };
    })
);

export type AvatarId = (typeof AVATAR_OPTIONS)[number]["id"];

const STYLE_PATTERN = NEUTRAL_STYLES.join("|"); // safe: static values only

/**
 * True only for option ids in the curated list. Never trusts client-supplied
 * values (the regex only matches the exact style + seed range defined above).
 */
export function isValidAvatar(id: unknown): id is AvatarId {
  if (typeof id !== "string") return false;
  // Seed range must match SEED_COUNT (avatar_01..avatar_24) exactly.
  return new RegExp(`^(${STYLE_PATTERN}):avatar_(0[1-9]|1[0-9]|2[0-4])$`).test(id);
}

/**
 * Resolves a stored option id to its DiceBear neutral image URL. Returns null
 * for unknown/malformed ids so callers render the no-avatar fallback.
 */
export function getAvatarUrl(id: unknown): string | null {
  if (!isValidAvatar(id)) return null;
  const [style, seed] = id.split(":");
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/svg?seed=${encodeURIComponent(seed)}`;
}