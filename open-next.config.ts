// OpenNext config for Cloudflare deploys (only used by `opennextjs-cloudflare
// build`; the Vercel build is untouched).
//
// The incremental cache is what makes prerendered pages work at all. OpenNext
// defaults it to "dummy", which persists nothing — so every statically
// generated route (489 of them at the last build) answered 404 on Workers.
// This config uses Workers KV, the one durable cache a Cloudflare free account
// needs no payment method for: build-time entries are uploaded by
// `opennextjs-cloudflare populateCache` (which `deploy` runs automatically, and
// `npm run cf-build` runs against the local namespace), and a revalidated page
// is written back over the same key at runtime. That write-back is what makes
// the two routes that declare `revalidate = 60` (/resources and /showcase, both
// locales) actually refresh every 60 seconds instead of on the next deploy. The
// earlier static-assets cache could only read.
//
// Trade-offs, because they are real and documented upstream:
// - KV is eventually consistent (a write can take up to ~60 seconds to reach
//   every location), so a revalidated page can be briefly older than fresh.
// - The free tier allows 100k reads and 1k writes per day. A deploy writes one
//   entry per prerendered page (~489), and each revalidation writes one more;
//   a route revalidates at most once per 60 seconds.
// - OpenNext's own recommendation for ISR is R2 plus a Durable Object queue and
//   a D1 tag cache. R2 needs a payment-verified Cloudflare account, which this
//   project does not have yet, so KV is what ships now. The upgrade path is in
//   docs/migration-cloudflare.md.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue";

export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  // Leaving the queue at its "dummy" default made OpenNext throw
  // "Dummy queue is not implemented" on every request to a page that declares
  // `revalidate` — which the Worker surfaced as an ERROR log. The memory queue
  // is the adapter's supported queue for this setup: it re-requests the route
  // through the WORKER_SELF_REFERENCE binding (already declared in
  // wrangler.jsonc) and de-dupes revalidation within an isolate. It is the
  // adapter's documented *staging* queue rather than the production one: under
  // real traffic several isolates can each revalidate the same route, which
  // costs extra KV writes but not correctness. The production queue is the
  // Durable Object queue — see the upgrade path in docs/migration-cloudflare.md.
  queue: memoryQueue,
});
