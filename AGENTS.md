<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Course content checklist (required)

Whenever lessons are added or changed in `content/lessons/`, all of the following are REQUIRED:

1. **Progress export/import must still work.** Any new or modified per-lesson progress data (fields on `LessonRecord` or `ProgressSnapshot`) must be wired through all three layers — `src/lib/progress-store.ts` (persist), `src/lib/sync-types.ts` (shape), and `src/lib/sanitize-snapshot.ts` (sanitizer) — so it survives the Settings → "Download my progress" / import round-trip. The sanitizer drops unknown fields by design: an unwired field silently disappears from exports, imports, and cloud sync. Verify by completing the new lesson, exporting, and confirming its record is present and intact.

2. **Every lesson page must load.** Lesson routes are dynamic (`ƒ`) so `npm run build` does NOT render them and will pass even when a lesson throws a runtime/MDX compile error. Once the dev server is up, request the page for every added/changed lesson (e.g. `GET /en/lessons/<slug>`) and confirm it returns 200 with the lesson content — not a server error. Invalid JSX-style attributes in `.mdx` files (e.g. a backslash-escaped quote in a string attribute, which JSX does not process) are a common cause.

3. **Update the README.** Keep `README.md` current — at minimum the lesson count and any other course stats it lists — so the documented numbers match the actual lesson set.

## Changelog (required)

Every new feature, lesson, or bug fix must be logged in `CHANGELOG.md` at the repo root as part of the same change. Add the entry in the same commit that ships the work — never defer it. Entries start empty and only cover changes made from now on.
