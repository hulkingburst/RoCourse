# Changelog

## 2026-09-25

- Contact: added a localized contact page with the business email, a mailto action, and a themed contact button in the footer; the page is included in the sitemap.
- Mobile: the fixed Star and Feedback controls now fade out while the footer is visible on narrow screens, with extra footer clearance as a fallback when IntersectionObserver is unavailable.

## 2026-09-22

- Content: added the UI Menus lesson after the shop panel — Visible as the on/off switch, one-button toggling with `not`, an idempotent close (X) button, the Escape key via UserInputService with the `gameProcessed` guard, a click-outside backdrop that closes together with the panel so it can't block clicks, and routing every open/close through one `setMenu(open)` function — with 4 multiple-choice, 1 write-code, and 1 fill-in-the-blank activity; renumbered the rest of the Game Systems section (modules and later) to make room; README lesson count updated to 104.
- Structure: added a new **UI & Screens** section (before Game Systems) so interface work is its own category — moved the GUI basics, both input-service lessons, the shop panel, and UI menus into it (guis, UDim2, gui-styling, UserInputService, ContextActionService, shop-ui, ui-menus); Game Systems now starts at the clicker lesson and the seven new-section lessons sit between Player Data & Security and the clicker game.

## 2026-09-21

- Performance: added the Client Performance lesson — the 16 ms frame budget, Heartbeat vs RenderStepped per-frame work, the four client costs (unnecessary loops and repeated Instance searches, allocation churn, expensive UI updates, frame-budget overload), measuring with View → Performance and the MicroProfiler before optimizing, bottleneck vs micro-optimization — with a sandbox exercise that rebuilds a label only when its value changes; renumbered memory-leaks (5 → 6), refactoring (6 → 7), testing-fundamentals (7 → 8), and next-steps (8 → 9) to slot it right after optimization.
- Responsive: fixed the highest-impact narrow-viewport issues — leaderboard controls and guest rows now wrap, the lesson header lets controls wrap under the title, the week label reads `w-32 sm:w-40`, search results let titles shrink instead of crowding badges, sidebar lesson titles keep their icons (min-w-0), code-block header buttons show text only on sm+, activity-calendar cells share width instead of overflowing narrow cards, the glossary popover is capped to the viewport, and the site header tightens its gutter and logo under 640 px.

## 2026-09-20

- Errors: rebuilt the Luau sandbox WASM from the Luau source tree with a growable heap (64 MiB initial, up to 2 GiB, previously a hard 16 MiB), so Try it / RunCode / the playground no longer abort with `Aborted(OOM)` on scripts that allocate past the old ceiling; the wrapper and rebuild script live in `tools/luau-sandbox/`.
- Performance: added the Memory Leaks lesson — why things you Destroy can still stick around (a reference that never lets go), the three classic leaks (created-never-destroyed, connections that stack, lists that never let go), and cleanup habits for respawns and player leaves; renumbered the next-steps lesson to make room.
- Quality: added the Refactoring lesson — the five smells (unclear names, magic values, deep nesting, giant functions, repetition), safe one-step-at-a-time rules, named constants, guard clauses, and extracting responsibilities out of a giant handler — with a sandbox exercise proving behavior survives a cleanup.
- Quality: added the Testing Fundamentals lesson — one test as a claim with a verdict, the four cases (happy path, edge, invalid, failure), self-explaining assertions, pure functions vs live-game systems, the red-green fix loop with a sandboxed wallet exercise, and regression tests that lock in fixes.
- Content: renumbered the next-steps lesson (6 → 8) to keep the new Refactoring and Testing Fundamentals lessons before the course map; README lesson count updated to 102.

## 2026-09-18

- Errors: added a custom `global-error` page so a crashing route or root layout renders an on-brand error screen instead of the bare framework page — includes a retry button and a feedback dialog that posts straight to `/api/feedback` (same flow as the site's footer button). Vercel's own platform-level crash page remains outside our control.
- Guards: added the Security Audit lesson — a deliberate, exploiter's-eye walk through the whole game (every remote, every trust boundary, every free-typed value) against the value/rules/pace checklist; renumbered the data bug hunt and save-loop lessons to make room.

## 2026-09-17

- Home page: replaced the static lesson-count, total-time, and final-project cards with live site-wide counters — lessons completed, XP earned (registered learners plus guests), and registered learners — recomputed from the database on every page load.
