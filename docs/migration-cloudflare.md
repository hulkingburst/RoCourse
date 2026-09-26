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
| Build orchestrator | `scripts/vercel-build.js` | Pages build command (`opennextjs-cloudflare build`) |
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
- **Phase 2 — DB (implemented, gated):** `src/lib/prisma.ts` now selects the
  driver via `PRISMA_ADAPTER` — `pg` (default, unchanged `@prisma/adapter-pg`)
  or `neon` (`PrismaNeonHTTP` from `@prisma/adapter-neon` over the Neon
  serverless HTTP driver, no sockets). Live-tested locally against the real
  Neon DB with both drivers (leaderboard/questions GETs OK, no errors). Set
  `PRISMA_ADAPTER=neon` on the Cloudflare build; re-validate during the Phase 4
  preview, then consider making neon the permanent default on both hosts.
- **Phase 3 — runtime compat (implemented, gated):** `trustedIp()`
  (`src/lib/auth-limiter.ts`) now prefers **`CF-Connecting-IP`** first
  (additive: Vercel sends it only if proxied through Cloudflare, otherwise the
  old `x-real-ip` / `x-forwarded-for` fallback applies, so production is
  unchanged). Analytics is swap-ready via baked `NEXT_PUBLIC_ANALYTICS`
  (`cloudflare` loads the Cloudflare Web Analytics beacon through the new
  `CloudflareAnalytics` client component and swaps the CSP hosts;
  anything else keeps Vercel Analytics and its CSP hosts). `next/image` is
  left as-is pending the OpenNext preview in Phase 4.
- **Phase 4 — Pages pipeline:** OpenNext build config + `wrangler`; migrate
  env vars; deploy to a preview host (e.g. `rocourse.pages.dev`) and diff
  against `ro-course.vercel.app`.
- **Phase 5 — cutover:** only with explicit approval. DNS/domain changes are
  out of scope until then.