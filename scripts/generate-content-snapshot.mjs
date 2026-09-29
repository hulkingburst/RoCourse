/**
 * Bakes `src/generated/content-snapshot.json` from `content/lessons/*.mdx`.
 *
 * The app normally reads lessons off disk, which works on Vercel, in `next dev`
 * and during any `next build`. Cloudflare Workers has no filesystem — OpenNext
 * serves from a read-only bundle — so every request-time read of a lesson file
 * fails there. The snapshot is that missing data, precomputed and committed so
 * the runtime can answer every content question without touching disk.
 *
 * The Vercel path keeps preferring the filesystem, so a stale snapshot can
 * never serve stale content on either host: `cf-build` regenerates it before
 * every Cloudflare deploy, and Vercel never looks at it. Run
 * `npm run content:snapshot` by hand after editing lessons to keep the
 * committed copy honest.
 *
 * Output is deterministic — same lesson content in, byte-identical file out —
 * so a regenerate with no content change leaves the tree clean.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(root, "src", "generated", "content-snapshot.json");

/**
 * The app imports through the tsconfig `paths` aliases, which plain Node does
 * not resolve. Register the same two mappings so this script can call the
 * app's own parser instead of re-implementing it (and drifting from it).
 */
const ALIASES = [
  ["@content/", path.join(root, "content")],
  ["@/", path.join(root, "src")],
];

registerHooks({
  resolve(specifier, context, nextResolve) {
    for (const [prefix, base] of ALIASES) {
      if (!specifier.startsWith(prefix)) continue;
      const mapped = path.join(base, specifier.slice(prefix.length));
      for (const candidate of [
        mapped,
        `${mapped}.ts`,
        `${mapped}.tsx`,
        path.join(mapped, "index.ts"),
      ]) {
        // Windows absolute paths (`C:\...`) are not valid ESM specifiers, so
        // hand the loader a file URL instead.
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

const { buildContentSnapshot } = await import("../src/lib/lesson-content.ts");

const snapshot = buildContentSnapshot();
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
const previous = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : null;

if (previous === serialized) {
  console.log(
    `[content-snapshot] unchanged — ${snapshot.metas.length} lessons already in sync`
  );
} else {
  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, serialized, "utf8");
  console.log(
    `[content-snapshot] wrote ${snapshot.metas.length} lessons to ` +
      `${path.relative(root, OUTPUT)} (${(serialized.length / 1024).toFixed(0)} KB)`
  );
}
