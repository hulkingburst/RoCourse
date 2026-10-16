# Task prompt — RoCourse further hardening (guest board, XP push, privacy disclosure, hygiene)

Copy everything below the line into the main dev agent as the task.

---

## Your job

You are the dev agent completing a second hardening pass on RoCourse. This round is narrowly scoped:

1. [Finding A] Stop publishing every guest's `guestId` on the weekly board; let the server mark the caller's own row. Zero UI diff.
2. [Finding B] Require ownership proof only for a guest id that already exists in the board data; adopting a fresh id stays free. Closes a hijack at zero user cost.
3. [Finding C] Guard the stale-client weekly-XP push: never send a blob with empty `weeklyXp` when local progress has lessons.
4. [Fix D] Reenact `d4b97b4` semantics: clamp and re-derive completion dates on the single shared derivation path, session wins over `guestId` on votes.
5. [Finding E] Add privacy-page disclosure text for the added processor paragraph and DiceBear credit line.
6. [Hygiene] Untrack build/dev logs, prune rate-limit rows, index hot queries, `no-store` on personalized responses, same-origin checks on mutation routes, tighten R2 key / signed-URL scoping, delete dead code. No learner-facing behavior changes.

Do not re-open findings 1–14 of the earlier task or their fixes. Do not change lesson content or lesson count. Do not add notifications or announce anything.

## Ground rules (unchanged)

- Read `node_modules/next/dist/docs/` first and follow the version's actual conventions; heed deprecations.
- Verify each item by running `npx tsc --noEmit --incremental false`, `npx eslint .`, and `npm run build`, and report the **real** exit codes. Preserve exit codes through any filtering. Fix causes, never weaken assertions or add suppressions.
- Keep diffs minimal and match existing conventions. Do not add dependencies without justification.
- Do not touch secrets, do not commit or push, do not add user-facing notifications.
- If anything touches per-lesson progress data, re-satisfy the content checklist.

## Interface anchor resolved

The earlier draft cited paths that do not exist in this tree. Use the actual ones below and re-read each file before editing.

- **Weekly board payload:** [src/app/api/leaderboard/route.ts](src/app/api/leaderboard/route.ts) (`/api/leaderboard?week=X&view=Y` returns `{ week, view, rows: [{ id, name, xp, handle, guestId }] }`; the `guestId` field at the end of the row mapper is the whole issue). Board page: [src/app/[locale]/(main)/leaderboard/page.tsx](src/app/[locale]/(main)/leaderboard/page.tsx).
- **Board UI:** [src/components/leaderboard/leaderboard-client.tsx](src/components/leaderboard/leaderboard-client.tsx) — `isMe(row)` compares `row.guestId === guestId` for guests, `row.handle === session?.user?.handle` for accounts; the owner marker must land in the row and this comparison must flip to reading a server-provided marker. Row type comes from `LeaderboardRow` in the same file's module (the route's return type).
- **Guest identity state:** [src/lib/guest-store.ts](src/lib/guest-store.ts) (zustand, persisted to localStorage: `guestId`, `token`, `name`), [src/lib/guest-identity.ts](src/lib/guest-identity.ts) (server-issued signed token), [src/lib/use-guest-xp-reporter.ts](src/lib/use-guest-xp-reporter.ts) (posts the XP row).
- **XP sync payload:** [src/lib/sync-api.ts](src/lib/sync-api.ts) + [src/app/api/sync/route.ts](src/app/api/sync/route.ts) — `weeklyXp` within the sanitized progress snapshot; session identity is read from the parent `auth()`/`session` shape used by the app.
- **Privacy page:** [src/app/[locale]/(main)/privacy/page.tsx](src/app/[locale]/(main)/privacy/page.tsx) with the processor list in [src/lib/privacy.ts](src/lib/privacy.ts).
- **Votes:** [src/app/api/leaderboard/route.ts](src/app/api/leaderboard/route.ts) (vote endpoint) — the session-vs-guestId tie-break decision from `d4b97b4`.

If any of those files differ from what this task actually runs against, trust the on-disk file and report the discrepancy.

## Item-by-item requirements

### A. Guest board hides every guest's id

**Where:** [src/app/api/leaderboard/route.ts](src/app/api/leaderboard/route.ts) line 99 retuns `guestId` in every row; the only consumer is `isMe()` in [src/components/leaderboard/leaderboard-client.tsx](src/components/leaderboard/leaderboard-client.tsx), which compares it against `guestId` from `useGuestStore` (localStorage) for unauthenticated viewers. Accounts already match by `handle` (there is no guest id on an account's row).

**Required outcome:** The board payload must no longer contain `guestId` on any row. The server must mark the caller's own row in-band instead — a boolean like `you: true`, a role field, or an `isOwn: boolean` — and the UI must stay **byte-for-byte identical** to today's rendering. The client's `isMe()` must read the server's marker: `handle` equality for accounts, and for guest viewers the marker must not rely on the id at all (a server-known row is the caller's own because the caller chose it and proved it; the marker is the only signal that travels back).

**Verify:** request `/api/leaderboard?week=X&view=Y` twice — once with an account, once as `guestId=<fresh uuid>` — with two identities; the response contains no `guestId` key anywhere and the row the caller owns carries the `you` marker. Show the before/after `curl` snapshot and the client-side `isMe` diff. The React tree renders byte-for-byte the same (text diff, not a screenshot).

### B. Ownership proof only when the id already has data

**Where:** [src/app/api/guest-xp/route.ts](src/app/api/guest-xp/route.ts) (the doc comment promises a caller who "cannot prove it owns" its id gets a fresh one; the implementation only shape-checks and signs whatever it was handed). `src/lib/guest-identity.ts` (server-issued signed token) and `src/lib/use-guest-xp-reporter.ts` (posts the XP row).

**Required outcome:**
- Adopting a **fresh, unused** guest id remains free — no ownership proof, exactly as today.
- **Ownership proof (`verifyGuestToken` output) is required only when the id already exists with data on the weekly board.** A first-time guest, a returning device, and a device that cleared storage all behave exactly today — only replaying a live id that belongs to someone else fails.
- The server must not sign an id it did not issue. A token may be issued for an *unclaimed* id and stored with the caller, but it must carry the server's signature and the id must be server-assigned, not a caller-supplied string the server merely echoes.

**Verify:** show three flows: (1) a brand-new id accepted with no token, same as today; (2) a returning device with cleared storage re-adding its id — accepted with no proof, same as today; (3) an authenticated caller requesting ownership proof for an id that already has data — rejected without a valid server-issued token. State clearly which flows ran and which were only reviewed statically.

### C. Guard the stale-client weekly-XP push

**Where:** the sync flow in [src/lib/sync-api.ts](src/lib/sync-api.ts) / [src/app/api/sync/route.ts](src/app/api/sync/route.ts) hands the client a `weeklyXp` bucket inside the sanitized snapshot. A device whose progress has lessons but whose picked weekly totals are empty (guest, leftover, cleared totals) can overwrite a fuller bucket from elsewhere.

**Required outcome:** The client never pushes a blob whose `weeklyXp` is empty while its local lesson state still has lessons. Detect the condition server-side and reject (or re-derive) the payload rather than storing an empty bucket that erases the board row. This is a guard, not a fix to row deletion — rows must still be pruned when the learner genuinely clears their progress.

**Verify:** with a logged-in account that has lessons, POST a valid blob with empty `weeklyXp` and confirm it is rejected (or the weekly rows are left untouched); then POST a blob with real weekly totals and confirm rows are written. State which mechanism you chose and why.

### D. Reenact `d4b97b4`

Read the commit and its diff first (`git show d4b97b4`). Reproduce every change by behavior in the relevant paths (sync completions, certificate dates, vote tie-break) and list what you matched in the report. Do not cherry-pick unrelated lines.

### E. Privacy-page disclosure text

**Where:** [src/app/[locale]/(main)/privacy/page.tsx](src/app/[locale]/(main)/privacy/page.tsx) with the processor list in [src/lib/privacy.ts](src/lib/privacy.ts).

**Required outcome:** An added processor paragraph covering the processors that shipped since the page was written (PurgoMalum for user text, ElevenLabs for lesson prose, DiceBear for avatars, Cloudflare Analytics replacing Vercel Analytics on the CF build), plus DiceBear's credit line. Content only — no policy behavior, template, or other page change. If a license you look up demands attribution where the avatar is shown rather than only in credits, note that as a side effect and leave the visible line in place only if it stays compliant.

**Verify:** quote the new paragraph and the credit line in the report, and state which licensing pages you read to write them.

### F. Repo and ops hygiene

Pick from the list, then do these specific ones:

- **Untrack logs:** remove from version control the build/dev logs, HTML captures, `narration-samples/` samples, and anything else non-source that is currently tracked or cluttered (check `git ls-files` first; you decide the exact set).
- **Prune rate-limit rows:** run whatever scheduled/pruning path exists so `rateLimitEvent` cannot grow unbounded (look at [src/lib/rate-limit.ts](src/lib/rate-limit.ts)), then verify the table stays within the documented bound.
- **Index hot queries:** add missing indexes for the read-heavy tables (`rateLimitEvent`, `weeklyXp`, `authAttempt`, `courseCompletion`) based on the queries the shim actually runs.
- **`no-store` on personalized responses:** apply `Cache-Control: no-store` (plus `Vary` where the response differs by session) to account-specific endpoints (`/api/sync`, `/api/leaderboard`, `/api/guest-xp`, `/api/profile`, any session-scoped route).
- **Same-origin checks on mutation routes:** `POST`/`PATCH`/`DELETE` routes check that the origin (matched against allowed origins, not the raw `Host`) is the app origin before acting on state-changing input.
- **Tighten R2 key / signed-URL scoping:** the upload probe ([src/app/api/resources/upload/route.ts](src/app/api/resources/upload/route.ts)) and [src/lib/file-storage.ts](src/lib/file-storage.ts) should not hand out signed writes for keys outside `resources/`, and the presigned PUT and verify flows should share the ownership token established in Finding B.
- **Delete dead code:** remove exports that are imported nowhere and files that contain no active behavior (search for unimported exports, then re-run the build to confirm nothing broke).

Verify the whole pass with the three commands above after all changes; report each exit code.

## Report

For every item: what you changed (file + short description), which flows you actually exercised, the observed result, and the real `tsc`/`eslint`/`build` exit statuses. List anything you could only review statically. Do not commit or push. Do not announce anything.
