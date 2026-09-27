// OpenNext config for Cloudflare deploys (only used by `opennextjs-cloudflare
// build`; the Vercel build is untouched). No cache/queue overrides are set, so
// caching falls back to "dummy" — no R2 bucket, Durable Object, or paid
// bindings are required. See package README overrides for cache variants.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();