// OpenNext config for Cloudflare deploys (only used by `opennextjs-cloudflare
// build`; the Vercel build is untouched).
//
// The incremental cache choice is what decides whether prerendered pages work
// at all. OpenNext defaults it to "dummy", which persists nothing — so every
// statically generated route (the lessons, the review pages, the guides) answers
// 404 on Workers. `staticAssetsIncrementalCache` serves them from the Worker's
// own static assets instead: prerendering works with no R2 bucket, KV
// namespace, Durable Object, or paid binding.
//
// One consequence to know about: /resources and /showcase declare
// `revalidate = 60`, and a read-only cache cannot store a revalidated copy. On
// Cloudflare they serve their build-time HTML and refresh on the next deploy
// rather than every 60 seconds. True ISR on Cloudflare needs a durable cache
// (R2 or KV) — see docs/migration-cloudflare.md.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

/**
 * The same cache, with its two write methods shadowed to no-ops.
 *
 * A read-only cache never accepts a write, and OpenNext logs every rejected
 * write at ERROR level — so a revalidating page fills the logs with a line that
 * means nothing, since the immutable bundle makes storing a revalidated page
 * impossible rather than broken. `get` is inherited untouched, so staleness
 * still reports the real build-time `lastModified` and revalidation runs
 * exactly as Next expects; only the misleading log goes away.
 */
const readOnlyIncrementalCache: typeof staticAssetsIncrementalCache =
  Object.create(staticAssetsIncrementalCache, {
    set: { value: async () => {} },
    delete: { value: async () => {} },
  });

export default defineCloudflareConfig({
  incrementalCache: readOnlyIncrementalCache,
  // Leaving the queue at its "dummy" default made OpenNext throw
  // "Dummy queue is not implemented" on every request to a page that declares
  // `revalidate` — which the Worker surfaced as an ERROR log. The memory queue
  // is the adapter's supported queue for this setup: it re-requests the route
  // through the WORKER_SELF_REFERENCE binding (already declared in
  // wrangler.jsonc) and de-dupes revalidation per isolate.
  queue: memoryQueue,
});