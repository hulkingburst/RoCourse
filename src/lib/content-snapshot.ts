import generated from "@/generated/content-snapshot.json";
import type { ContentSnapshot } from "@/lib/lesson-content";

/**
 * The committed lesson snapshot, used whenever the lesson files are not on
 * disk — i.e. on Cloudflare Workers, where OpenNext serves a read-only bundle
 * and every `fs` read of `content/` fails.
 *
 * `src/lib/lessons.ts` prefers the real files and only reaches for this when
 * they are unreadable, so Vercel, `npm run dev` and `next start` are unchanged
 * and can never serve stale content. `cf-build` regenerates the file before
 * every Cloudflare deploy, so the Cloudflare target cannot go stale either.
 * Regenerate by hand with `npm run content:snapshot` after editing lessons.
 *
 * The cast keeps the 161 KB JSON import from becoming a huge inferred literal
 * type — the shape is asserted against `ContentSnapshot` instead.
 */
export const CONTENT_SNAPSHOT = generated as unknown as ContentSnapshot;
