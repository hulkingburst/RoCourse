# Changelog

## 2026-09-20

- Performance: added the Memory Leaks lesson — why things you Destroy can still stick around (a reference that never lets go), the three classic leaks (created-never-destroyed, connections that stack, lists that never let go), and cleanup habits for respawns and player leaves; renumbered the next-steps lesson to make room.

## 2026-09-18

- Errors: added a custom `global-error` page so a crashing route or root layout renders an on-brand error screen instead of the bare framework page — includes a retry button and a feedback dialog that posts straight to `/api/feedback` (same flow as the site's footer button). Vercel's own platform-level crash page remains outside our control.
- Guards: added the Security Audit lesson — a deliberate, exploiter's-eye walk through the whole game (every remote, every trust boundary, every free-typed value) against the value/rules/pace checklist; renumbered the data bug hunt and save-loop lessons to make room.

## 2026-09-17

- Home page: replaced the static lesson-count, total-time, and final-project cards with live site-wide counters — lessons completed, XP earned (registered learners plus guests), and registered learners — recomputed from the database on every page load.
