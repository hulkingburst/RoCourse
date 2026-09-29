# Cloudflare Migration Plan

Branch-only work — this branch carries Cloudflare-prep code, all of it gated
(env-driven) so `main` and the production site at `ro-course.vercel.app` behave
identically until a phase is explicitly activated. This document records the
findings and the phased plan.

## Current state

- **Framework:** Next.js 16.3.3 (App Router), React 19, Turbopack builds,
  `next-intl` v4 (EN/ES), `next-auth` v5-beta (Credentials + JWT sessions),
  Prisma 6 with `@prisma/adapter-pg`, Tailwind 4.
- **Rendering:** heavily static. ~245 content pages are pre-rendered (`●` in the
  route table); only account/leaderboard/question pages and the 15 API routes
  remain dynamic. Favorable for a Cloudflare move.
- **Static-first architecture is what Cloudflare Pages/Workers are built for.**

## Inventory

### API routes (15, all `runtime = "nodejs"`)

`/api/auth/[...nextauth]`, `/api/sync`, `/api/daily-challenge`, `/api/feedback`,
`/api/follow`, `/api/guest-xp`, `/api/leaderboard`, `/api/notifications`,
`/api/questions`, `/api/questions/[id]`, `/api/questions/[id]/answers`,
`/api/questions/[id]/solved`, `/api/showcase/submit`,
`/api/resources/submit`, `/api/resources/upload`.

Common pattern: Prisma (pg) queries + outbound GitHub API fetches + DB-backed
rate limiting. On Cloudflare these become **Pages Functions**.

### Vercel-specific pieces

| Piece | Location | Cloudflare replacement |
|---|---|---|
| Blob client-token upload flow | `@vercel/blob` in `submit-form.tsx` + `upload/route.ts` | R2 presigned-PUT |
| Blob host whitelist | `BLOB_HOST_RE` in `resources/submit/route.ts` and `resources.ts` | R2 bucket host regex |
| Vercel Analytics | `<Analytics />` in `[locale]/layout.tsx` + CSP entries | Cloudflare Web Analytics beacon |
| Build orchestrator | `scripts/vercel-build.js` | `npm run cf-build` (snapshot → build → cache populate) |
| CLI artifacts | `.vercel/project.json`, `.vercelignore` | irrelevant (keep, harmless) |

### Storage / database

- **Neon Postgres** via `pg` + `@prisma/adapter-pg`. For Cloudflare the chosen
  path (Phase 2) is `@prisma/adapter-neon`'s **`PrismaNeonHTTP`** driver
  (pure HTTPS, no TCP/WebSocket sockets) behind `PRISMA_ADAPTER=neon` — no
  Hyperdrive binding or paid plan needed, and it also runs on Vercel.
  `@prisma/adapter-pg-worker` + Hyperdrive remains available but requires a
  Cloudflare paid plan + a binding created in the dashboard.
- **Vercel Blob** (v2.7) is the most coupled piece. Flow: browser calls
  `upload()` -> `/api/resources/upload` issues control-plane token via
  `handleUpload` -> browser `PUT`s to Blob. Server deletes invalid files with
  `del()`. Replace with **R2 presigned uploads** (same UX, same 50 MB zip /
  entry / extension checks survive server-side). **Caveat:** Cloudflare
  requires a payment-verified account even for R2's free tier, so R2 stays
  dormant (default `FILE_STORAGE=vercel`) until/unless that's possible.

### Environment variables

| Var | Role | On Cloudflare |
|---|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | runtime (Prisma) | same; choose driver via `PRISMA_ADAPTER` |
| `PRISMA_ADAPTER` | runtime (driver select) | `pg` (default) or `neon` (HTTP, no sockets) |
| `AUTH_SECRET` | runtime (JWT signing) | same |
| `AUTH_TRUST_HOST` | runtime (next-auth) | same |
| `FEEDBACK_GITHUB_TOKEN` | runtime (GitHub API) | same |
| `FEEDBACK_GITHUB_REPO`, `RESOURCES_GITHUB_REPO` | runtime, optional | same |
| `BLOB_READ_WRITE_TOKEN` | runtime (Vercel upload path only) | drop on R2; use `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_HOST` |
| `FILE_STORAGE` | runtime (upload backend switch) | `vercel` (default) or `r2`; additive, dormant until set |
| `NEXT_PUBLIC_COURSE_NAME` | build-time | same |
| `NEXT_PUBLIC_SITE_URL` | build-time (metadata base) | set to new host at cutover |
| `VERCEL_OIDC_TOKEN` | Vercel-only | drop |

### Cloudflare-incompatible items (and the fix for each)

1. `@vercel/blob` upload/token/del flow -> R2 presigned. Largest work item;
   implemented gated (Phase 1) but stays dormant — R2 needs a payment-verified
   Cloudflare account, so Vercel Blob remains the active path for now.
2. `@prisma/adapter-pg` + `pg` sockets -> **`PrismaNeonHTTP`** via
   `PRISMA_ADAPTER=neon` (pure HTTPS, no sockets; free tier). `pg-worker` +
   Hyperdrive is the alternative if a paid plan/binding exists.
3. `@vercel/analytics` + CSP `script-src`/`connect-src` entries
   (`va.vercel-scripts.com`, `vitals.vercel-insights.com`,
   `*.public.blob.vercel-storage.com`) -> Cloudflare Web Analytics; CSP updated
   to `static.cloudflareinsights.com` (+ R2 bucket host in connect-src).
4. **`trustedIp()`** (`src/lib/auth-limiter.ts`) reads `x-real-ip` /
   `x-forwarded-for`. Behind Cloudflare the rightmost `x-forwarded-for` entry is
   Cloudflare's edge IP, so all visitors would collapse into one rate-limit
   bucket. Must prioritise **`CF-Connecting-IP`**. Silent auth/upload-guard bug
   if missed.
5. `next/image` on local logos (`site-header.tsx`, `course-sidebar.tsx`) ->
   verify under OpenNext; `images.unoptimized` is a safe fallback (local
   assets only).
6. `runtime = "nodejs"` + `maxDuration` exports -> `nodejs_compat`; `maxDuration`
   is ignored on Cloudflare and can be removed.

### Verified as non-issues

- `node:fs` / `node:path` (`src/lib/lessons.ts`): imported only by pages,
  `sitemap.ts`, and `opengraph-image.tsx` — all build/SSG time. No runtime
  import, so the Workers Filesystem API gap does not apply.
- `next/og` `ImageResponse` (`opengraph-image.tsx`): WASM-based
  (satori/resvg), edge-compatible.
- shiki (WASM), gray-matter + MDX, fuse.js, jszip (client-side), zustand,
  GitHub `fetch`, Luau WASM/JS in `/public`: all Cloudflare-safe.

## Recommended deployment model

**Cloudflare Pages with the OpenNext adapter** (`@opennextjs/cloudflare`):
- Neon + `PrismaNeonHTTP` (`PRISMA_ADAPTER=neon`) for Postgres — no Hyperdrive
  binding or paid plan required.
- Blob storage on R2 when it becomes viable (needs a payment-verified account);
  until then Vercel Blob stays the active upload path even after hosting moves.
- ~20 dynamic endpoints become a small Pages Functions surface (free tier:
  100k function requests/day).
- App Router, next-intl, next-auth, middleware, and static pages are preserved,
  no rewrite.

Alternative (hand-rolled Workers + static export) is a rewrite and unnecessary.

## Phases

- **Phase 0 (this doc):** branch + plan only. `main` untouched.
- **Phase 1 — storage swap (implemented, gated, on hold):** R2 presigned-PUT
  flow added behind `FILE_STORAGE=r2` + `R2_*` vars; default stays `vercel` so
  production is unaffected. Client probes the backend at
  `/api/resources/upload` (`{ probe: true }`), uploads straight to R2, then
  verifies via `/api/resources/verify` (server re-checks the ZIP magic and
  deletes the object on failure). `BLOB_HOST_RE` replaced by
  `isAllowedFileHost()` (accepts Vercel Blob always, and exactly
  `R2_PUBLIC_HOST` when set) in both the submit route and the read-time
  parser. CSP `connect-src` extended with the R2 S3 endpoint and `r2.dev`.
  **On hold:** Cloudflare requires a payment-verified account even for R2's
  free tier; until that's possible, `FILE_STORAGE` stays unset and Vercel Blob
  remains the active upload path (works on either host).
- **Phase 2 — DB driver ladders (implemented, gated):** `src/lib/prisma.ts`
  selects the driver via `PRISMA_ADAPTER` — `pg` (default, unchanged
  `@prisma/adapter-pg`) or `neon` (`PrismaNeonHTTP` from `@prisma/adapter-neon`
  over the Neon serverless HTTP driver, no sockets). **Superseded for
  Cloudflare:** a scratch worker proved workerd bans
  `WebAssembly.instantiate()` outright (the Prisma `engineType = "client"`
  WASM engine is refused, and native engines are x64/ELF), so *no* Prisma
  adapter can run on Cloudflare. The Cloudflare build therefore bypasses
  Prisma entirely via the Phase 4 neon SQL layer; `PRISMA_ADAPTER` remains the
  tuning knob for the Vercel/Node path only.
- **Phase 3 — runtime compat (implemented, gated):** `trustedIp()`
  (`src/lib/auth-limiter.ts`) now prefers **`CF-Connecting-IP`** first
  (additive: Vercel sends it only if proxied through Cloudflare, otherwise the
  old `x-real-ip` / `x-forwarded-for` fallback applies, so production is
  unchanged). Analytics is swap-ready via baked `NEXT_PUBLIC_ANALYTICS`
  (`cloudflare` loads the Cloudflare Web Analytics beacon through the new
  `CloudflareAnalytics` client component and swaps the CSP hosts;
  anything else keeps Vercel Analytics and its CSP hosts). The Cloudflare build
  sets `images.unoptimized` — the site only uses `next/image` on two local
  logos — which avoids needing the paid Cloudflare Images binding.
- **Phase 4 — Pages pipeline + DB layer (implemented, validated):**
  - **DB:** `src/lib/db/neon.ts` is a raw `@neondatabase/serverless` SQL layer
    covering the whole data model (find/update/upsert/count/aggregate/
    deleteMany/relations/`_count`/`$queryRaw`/`$transaction`, PG→Prisma error
    mapping so `err.code === "P2002"` checks keep working). `src/lib/prisma.ts`
    gates on `NEXT_PUBLIC_ANALYTICS === "cloudflare"` at server runtime:
    Cloudflare exports `neonDb` cast as `PrismaClient`, everything else keeps
    the real `PrismaClient` (call sites unchanged and still typecheck). All
    24 prisma importers were converted to work through the gate.
  - **Build/runtime:** `open-next.config.ts` + `wrangler.jsonc` +
    `npm run cf-build`, which regenerates the content snapshot, builds
    `.open-next`, and populates the static-assets cache — a bare build is
    directly servable by `wrangler dev`. `NEXT_PUBLIC_ANALYTICS=cloudflare`
    must be set in the build shell. `wrangler dev` needs `.dev.vars` (DB
    URLs via `DATABASE_URL_UNPOOLED ?? DATABASE_URL`, `AUTH_SECRET`, blob
    token) — `.dev.vars` is local-only and gitignored, never commit it.
  - **Content on a read-only bundle (resolved):** the Worker serves from
    `/bundle`, where `content/lessons` does not exist — `process.cwd()`
    resolves there and `fs` throws
    `ENOENT: no such file or directory, readdir '/bundle/content/lessons'`,
    even though Next's file tracing does copy the `.mdx` files into the server
    function. `src/lib/lessons.ts` now probes for the files once and falls back
    to `src/generated/content-snapshot.json`: every lesson's meta plus its
    headings, baked by `scripts/generate-content-snapshot.mjs`
    (`npm run content:snapshot`). Both sources derive from the same parser in
    `src/lib/lesson-content.ts`, so they cannot drift apart. Vercel, `next dev`
    and `next start` keep reading the real files and never touch the snapshot,
    and both build paths regenerate it — so it can never serve stale content on
    either host. Raw MDX is deliberately excluded: `/review/[slug]` is now
    statically generated like `/lessons/[slug]`, so no route needs lesson
    source at request time.
  - **Prerendered pages + revalidation (resolved):** OpenNext defaults its
    incremental cache to `"dummy"`, which persists nothing — so every
    statically generated route (468 of them) answered 404 on Workers.
    `open-next.config.ts` now selects `staticAssetsIncrementalCache`, which
    serves prerendered pages from the Worker's own static assets with no R2
    bucket, KV namespace, Durable Object or paid plan, plus the `memoryQueue`
    (which uses the `WORKER_SELF_REFERENCE` binding already declared in
    `wrangler.jsonc`). Its two write methods are shadowed to no-ops so an
    expected read-only rejection is not logged as an ERROR on every
    revalidation.
  - **Validated locally against the real Neon DB under `wrangler dev`:**
    `/api/leaderboard`, `/api/questions`, `/api/questions/[id]` → 200;
    `POST /api/guest-xp` valid → 200 and the row persists in Postgres,
    invalid → 400; `POST /api/questions` / `showcase/submit` / `sync` → 401
    (auth-gated before DB); `POST /api/feedback` → 503 without
    `FEEDBACK_GITHUB_TOKEN` (correct guard). `$queryRaw` site-stats JSONB
    aggregates verified against Postgres.
  - **Validated end to end — `wrangler dev` against the real Neon DB, and
    `npm run build` + `next start` on Node:** all 31 page routes and API
    endpoints swept on both hosts return 200, including the home page,
    `/lessons/[slug]`, `/es/lessons/[slug]`, `/review/[slug]`, `/profile`,
    `/questions`, `/certificate`, `/resources` and `/showcase`. On the Worker
    the only console output is the once-per-isolate `[lessons]` fallback line;
    the Node runtime never falls back and keeps reading files from disk.
  - **Remaining open items:** none blocking the hosting move.
    - R2 stays blocked (payment-verified account); Vercel Blob remains the
      upload path on either host.
    - `/resources` and `/showcase` declare `revalidate = 60`, and a read-only
      cache cannot persist a revalidated copy, so on Cloudflare they serve
      their build-time HTML and refresh on the next deploy rather than every 60
      seconds. Vercel is unaffected. True ISR needs a durable cache — KV is the
      free-tier option that needs no payment verification. Follow-up, not a
      blocker.
    - `engineType = "client"` removes the binary engine from Vercel functions
      and runs green locally.
- **Phase 5 — cutover:** only with explicit approval. DNS/domain changes are
  out of scope until then.