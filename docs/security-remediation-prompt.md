# Task prompt — RoCourse security & integrity remediation

Copy everything below the line into the main dev agent as the task.

---

## Your job

You are the sole dev agent on **RoCourse**, this repository: a Next.js (App Router) + React interactive Luau course, with Prisma/Postgres (Neon) on Vercel and an OpenNext/Cloudflare Workers path, NextAuth v5, Vercel Blob storage (plus an R2 path), ElevenLabs narration, and MDX lessons in `content/lessons`. A read-only security review produced the findings below. **Fix them, in the order given.** Findings 1–8 are exploitable or correctness-breaking and are in scope for code changes now. Findings 9–14 are listed separately with the treatment each needs — do not "fix" them by guessing.

A review is not a spec: **re-verify each finding against the current code before you change it.** The line numbers and file paths below were accurate at HEAD `462d5d6`, but the tree moves. If a finding no longer reproduces, say so in your report instead of writing a speculative fix.

## Ground rules (non-negotiable)

1. **Read the Next.js docs first.** This Next.js version has breaking changes vs. your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing route/page code, and heed deprecation notices.
2. **No new user-facing notifications.** Never add, edit, or send a bell entry — no broadcast lists (`src/lib/updates.ts`, `src/lib/polls.ts`), no badge awards, no ad-hoc pushes through the notifications API — unless I explicitly ask. Some of these findings touch notification code; fixing a *write* is fine, announcing something is not.
3. **Log every change in `CHANGELOG.md`** at the repo root, in the same batch of work, in the file's existing style. Never defer it.
4. **Keep the tree shippable.** After each fix, and again at the end, run and report the real exit status of:
   - `npx tsc --noEmit --incremental false`
   - `npx eslint .`
   - `npm run build`
   Preserve exit codes when you filter output (use `PIPESTATUS` / `pipefail`); a filtered pass is not a pass. Fix causes — do not weaken assertions, add suppressions, or swallow errors to make a check go green.
5. **Minimal diffs, existing conventions.** Prefer editing existing files. Match surrounding style and the repo's existing helpers. Do not add dependencies unless a fix genuinely needs one, and justify it in the changelog entry if so.
6. **Do not touch secrets.** Do not read `.env*`, `.dev.vars`, or print credential values. Do not commit or push unless I ask.
7. **If lessons change at all,** also satisfy the project's content checklist: wire any new per-lesson progress field through `src/lib/progress-store.ts`, `src/lib/sync-types.ts`, and `src/lib/sanitize-snapshot.ts` so export/import round-trips; confirm every added/changed lesson page returns 200 with content by requesting `/en/lessons/<slug>` from a running dev server (dynamic routes do not render during `npm run build`, so a green build proves nothing there); and update the lesson count/stats in `README.md`. These fixes should not require lesson edits — keep it that way unless unavoidable.

---

## Fix now — Critical

### 1. Any account can forge completion → fake certificates, showcase bypass, leaderboard fraud

**Where:** `src/lib/sync-api.ts` (`saveCloudState`, the `payload.completions` loop), `src/app/api/sync/route.ts` (`isValidPayload` shape-checks only), `src/lib/certificates.ts` + `src/app/[locale]/(main)/certificate/page.tsx` (render whatever rows exist), `src/app/api/showcase/submit/route.ts:83` (gate is a bare `courseCompletion.findFirst`), and `saveWeeklyXpRows` in the same file (weekly XP clamped only to the full weekly ceiling).

**Problem:** `POST /api/sync` persists a client-supplied `completions[]` array verbatim via `courseCompletion.upsert`, and the public share link resolves those rows with no session. One request from any free account mints a "RoCourse Certificate of Completion" with an arbitrary title and date, unlocks showcase submission, and tops the weekly board.

**Required outcome:**
- Stop trusting `payload.completions`. Derive completion records **server-side** from the already-sanitized progress blob — the evidence needed is already in it (`lessons["final-project"].completedAt` together with `finishedPath` / the final-project completion state). Ignore, or reject, any client-supplied `completions` field for persistence rather than merging it.
- Completion dates become **server-derived and consistent**, not write-once from client input: the same evidence must produce the same record on every sync, and a record must not be creatable without the underlying lesson evidence in the sanitized blob. Re-deriving is also the natural fix for finding 13 (permanently forged or wrong first dates).
- Showcase gating and weekly XP must rest on the same server-derived truth. If a user has no valid final-project evidence, nothing downstream treats them as complete.
- Keep the response contract in `src/lib/sync-types.ts` intact so the client merge in `src/components/auth/sync-host.tsx` keeps working; if the shape must change, update the client and the sanitizer together.

**Verify:** with a real signed-in session, POST a payload whose `completions[]` claims a completion but whose progress lacks the final-project evidence, and confirm **no** `CourseCompletion` is created and the certificate page shows nothing. Then POST a payload with genuine final-project evidence and confirm the record *is* created with a server-derived timestamp. Report both observations.

### 2. Unauthenticated delete-by-URL on the resource uploads bucket

**Where:** `src/app/api/resources/verify/route.ts:44-46` (calls `deleteR2Object` when the sniff returns false), `src/lib/zip-check.ts:16` (`looksLikeZip` fails closed to "not a zip" on fetch failure — so a failed fetch currently *causes* deletion), `src/lib/file-storage.ts` (`deleteR2Object(fileUrl)`, key taken verbatim from the caller's URL), `src/lib/resources-shared.ts:83` (host allowlist accepts any `*.public.blob.vercel-storage.com` plus `R2_PUBLIC_HOST`).

**Problem:** An anonymous caller can hand `verify` a URL on any allowlisted host; if the remote object isn't a ZIP *or the fetch fails*, the server deletes the R2 object named by that URL path. Inert only while R2 credentials are absent (the S3 call throws and is swallowed) — it arms the moment `R2_*` vars exist, even before `FILE_STORAGE=r2`.

**Required outcome:**
- A sniff failure is a **rejection of the submission**, never a delete. Deletion must only follow a positive determination that the uploaded object is invalid *and* that the caller owns it.
- Bind deletion to **proof of upload**: issue a signed, expiring token (or equivalent key-binding) when the presigned PUT is handed out, echo it back on verify, and only then delete — restricted to the `resources/` key prefix. Never accept an arbitrary URL as the deletion target.
- Fail closed everywhere in this path: unknown host, unexpected key shape, missing or bad token, fetch error → no delete and a clear rejection response.

**Verify:** show that (a) a sniff failure from an unreachable URL deletes nothing, (b) a valid URL with no upload token deletes nothing, (c) a URL outside the `resources/` prefix deletes nothing, and (d) the legitimate "I uploaded a non-ZIP, clean it up" flow still deletes exactly the object this client uploaded. If you cannot exercise R2 locally, say so explicitly rather than claiming the path is verified.

## Fix now — High

### 3. `$transaction` is not a transaction on the Workers SQL shim

**Where:** `src/lib/db/neon.ts:809` (`transaction`) exposed as `$transaction` at line 862 — a sequential `for` loop with no `BEGIN`/`COMMIT`/`ROLLBACK`.

**Problem:** Callers that assume atomicity will half-apply on a mid-sequence failure: `changeUsername` (user row plus denormalized leaderboard names) and the feedback ticket+notification write. Result is silent denormalized-name drift and missing bell entries once the Cloudflare port goes live.

**Required outcome:** Either execute multi-statement writes as a single CTE statement where the shape allows, or add real transaction control to the shim. Whatever you choose, the affected callers must be genuinely all-or-nothing. Do not leave a comment claiming atomicity the code doesn't provide.

**Verify:** reproduce a mid-sequence failure (inject a failure on the second statement, or use a local Postgres/workerd harness) and show that no partial row set survives. If workerd/Miniflare can't be run in this environment, state that this rests on code reading plus whatever local reproduction you *could* do.

## Fix now — Medium

### 4. Signing in on a second device can erase past weekly leaderboard rows

**Where:** `saveWeeklyXpRows` in `src/lib/sync-api.ts` prunes every row older than the oldest week present in the incoming blob, contradicting its own "only ever raised" comment; the client merge gate in `src/components/auth/sync-host.tsx` pushes the local blob as-is when the cloud isn't newer.

**Required outcome:** Union incoming weeks with stored rows instead of pruning to the payload's minimum. Keep the table bounded by window/retention, not by the size of the latest payload. Preserve the "monotonic per week" guarantee and the existing name-refresh behavior.

**Verify:** simulate device A earning a week, then device B signing in with a blob containing only a later week, and confirm device A's rows survive. Also confirm a genuinely cleared blob still prunes as intended (see the existing `weeks.length === 0` branch).

### 5. Unauthenticated paid-TTS generation and permanent cache growth

**Where:** `src/app/api/tts/route.ts` (60 cache-miss generations/hour/IP of caller-chosen text, no account required), `src/lib/narration-cache.ts` (every result stored in the public Blob store forever; no expiry or sweep), `src/lib/elevenlabs.ts`.

**Required outcome:** Make paid synthesis reachable only for authenticated (or otherwise authorized) callers, and put a bound on stored audio — an expiry policy, a sweep/lifecycle, and a per-user limit. Anonymous visitors must still get narration via the browser-voice fallback path in `src/components/lessons/read-aloud.tsx`; do not break Read Aloud. Keep the existing narration normalization contract in `src/lib/narration.ts` (`MAX_NARRATION_CHARS`, etc.) as the input bound.

### 6. Unauthenticated storage parking with no server-enforced size cap

**Where:** `src/app/api/resources/upload/route.ts` hands out presigned R2 PUTs under a 10/hour/IP DB limit; the `PutObjectCommand` signer imposes no content-length condition, so the 50 MB cap exists only in client-side JSZip (`src/components/resources/submit-form.tsx`). Objects never referenced by a submission are never reclaimed.

**Required outcome:** A **server-enforced** size limit on the signed write (POST-policy conditions, `Content-Length` constraint, or a bound upload flow that streams through the app), plus a reclamation policy for orphaned objects (lifecycle rule or scheduled sweep). Assume the client is hostile — the client-side check is advisory only.

### 7. Guest leaderboard is farmable

**Where:** `src/app/api/guest-xp/route.ts` — accepts arbitrary client-generated guest ids, 120 posts/hour/IP, up to the `MAX_WEEKLY_XP` ceiling.

**Required outcome:** Make it materially harder for one IP to mint a board's worth of fake learners in an hour: server-issued/validated guest identities, a tighter per-IP and per-guest budget, and whatever cheap signal is already available (the existing DB rate-limit helper in `src/lib/rate-limit.ts`). Keep the feature working for legitimate single-device guests. Do not add a new third-party service for this.

### 8. Every notification-bell poll mutates and calls GitHub

**Where:** `GET /api/notifications` runs retraction deletes and `syncFeedbackResolutions` per request under the shared token (`src/app/api/notifications/route.ts`).

**Required outcome:** Move both side effects off the read path onto a throttled or scheduled path so a frequent poll stops being amplified GitHub API + DB writes. The GET must become (or be mostly) a pure read. Preserve current response shapes and the existing constraint that notification links are only navigable when `/`-prefixed.

---

## Do not fix blindly — needs a human decision

Handle these by **reporting**, not by changing behavior. If you believe one has a safe code-only fix, describe it and ask first.

- **9. Dev-only advisories** — 5 high findings in the `braces` chain via `eslint-config-next`; production audit is clean and there is no non-breaking fix yet. Leave as-is.
- **10. Privacy policy third-party list is incomplete** — user text also reaches PurgoMalum (`src/lib/moderation.ts`), lesson prose reaches ElevenLabs, avatars reach DiceBear, and the CF build swaps in Cloudflare Analytics (`next.config.ts`). Update the page only if I confirm the provider list; this needs review, not invention.
- **11. Missing CC BY 4.0 attribution for avatar art** — DiceBear styles in use include CC BY 4.0 remixes. Requires a credits surface plus license links, and confirmation from me. Do not add attribution text you can't verify.
- **12. Zero automated tests** — this is where a Workers port would silently regress (snapshot sanitization, week-key math, the SQL shim, rate limiters, moderation). Adding a test harness is worthwhile but is its own project; propose it as a follow-up rather than bolting it onto these fixes.
- **13. Certificate dates are write-once** — subsumed by fix 1 if completion dates become server-derived. Confirm that's how you resolved it.
- **14. JSON-LD sink doesn't escape `<`** — currently only repo-authored static data reaches `src/components/seo/json-ld.tsx`, so it is not exploitable today. Hardening it is in scope as a cheap defensive change *if* it stays a small, obviously-correct diff; otherwise note it.

Also noted and explicitly **not** a finding: the count-then-record TOCTOU in `src/lib/rate-limit.ts` is documented and accepted — it is an abuse guard, not exact accounting. Leave it.

## Report format

When done, give me:

1. **Per finding:** what you changed (file + short diff description), the verification you ran, and the observed result. Findings you could not reproduce or could not verify go under a clear "unverified / blocked" heading — never presented as passing.
2. **Real check output:** the exit status of the typecheck, lint, and build runs, plus any test/dev-server evidence. Preserve exit codes through any filtering.
3. **The changelog entry** you added.
4. **Anything you deliberately left alone**, with the reason.

Do not commit or push. Stop and ask me before any decision that changes user-visible behavior or requires a provider/legal judgment.
