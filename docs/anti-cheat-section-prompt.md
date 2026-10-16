# Task prompt — RoCourse anti-cheat section + relocation

Copy everything below the line into the main dev agent as the task.

---

## Your job

Add a new **optional** "Anti-Cheat & Safety" section to the course, and move the four existing lessons that already act as anti-cheat into it. Everything here is course-content work only — no app code, no schema, no API, no new dependencies, no notifications, no announcements, no commits or pushes.

Primary sources of truth for the change: `content/course.ts`, the lesson files under `content/lessons/`, and `src/lib/lessons.ts` + `src/lib/lesson-content.ts` (the course reads metadata from there).

---

## 0. Ground rules

- Keep every lesson file valid MDX. Use `<Step>`, `<Mcq>`, `<CodeBlock>`, `<BadgeSet>`, etc. only if the existing lesson set's component inventory supports them — check `src/content/mdx-components.ts` before assuming a tag works.
- Each new lesson is open-ended text but must have **two graded activities** so it lands on a medal.
- Do not touch lesson text inside existing lessons unless you are moving that lesson wholesale (see §2).
- If a change touches per-lesson progress data, it must be wired through `src/lib/progress-store.ts`, `src/lib/sync-types.ts`, and `src/lib/sanitize-snapshot.ts`. Keep the export/import round-trip intact (the sanitizer drops unknown fields).
- Do not commit or push. Report before/after with real command output.

## 1. Add the new section

**File:** `content/course.ts` — append to the exported `courseSections` array a section with:

- `id`: `anti-cheat`
- `title`: "Anti-Cheat & Safety"
- `description`: something that frames this as an optional, after-the-core-path category (e.g. "Read the walls before the walls read you — optional safety and anti-cheat practice for the whole course").
- `order`: a number that lands after the `final-project` section, before `advanced-studio`.

Add a sibling section entry if the course has a `courseSections` config used by `LessonList` — the section appears in `LessonsPage` and the sidebar through that data, so the section id must be listed in the same config the app imports.

## 2. Move the existing anti-cheat lessons into it

Move these four lessons under the new `anti-cheat` section. Do **not** delete or rename them.

- `security-audit.mdx` — "Security audit — hunt the gaps in your wall"
- `rate-limiting.mdx` — "Rate limiting — slow down the flood"
- `data-security.mdx` — "Data security — never trust the player"
- `server-authority.mdx` — "Server authority — the server is the referee"

For each moved lesson:

1. Keep the file path, slug, title, description, `estimatedMinutes`, `tags`, `objectives`, `prerequisites`, and body exactly as-is.
2. Update only the frontmatter: change `sectionId` to `anti-cheat` and renumber `order` so the four land consecutively inside the new section (e.g. orders 1–4 within that section), placed after any lessons that were already in that section. The rest of the `data` section keeps its original relative order and its own `order` values unchanged.
3. Keep the file path unchanged — the routes render by slug, and the snapshot generator, search, and progress stores key off the slug.

## 3. Build the new category's lessons

Create the following lesson `.mdx` files under `content/lessons/`. Each must be a complete, self-contained lesson with valid frontmatter and at least two graded `<Step>` blocks.

| Slug | Title | Suggested content |
|---|---|---|
| `cs-understanding-trust-boundaries` | Understanding trust boundaries | The concept, the three-question audit (value, rules, pace), why FireServer/OnServerEvent pair is the canonical boundary, and the difference between client-owned and server-derived values. |
| `cs-rate-limiting-and-spam` | Rate limiting and spam | Paced access, per-player limits, debounce vs. throttle vs. rate limit, why client timing can never protect you, and a server-side Luau cooldown sketch. |
| `cs-identity-proof` | Identity proof | The showdown over a guest id: a caller picks an id, the server must prove who owns it before it counts. The identity-issue flow with the server token, and the playbook for a clean game. Relate the lesson to the hardening in the app: ownership proof is required only when the id already has data. |
| `cs-security-audit-lab` | The security audit lab | A supervised re-run of the audit walkthrough: inventory remotes, score each boundary, harden the two most common findings (unchecked arguments, client-owned prices), and produce a one-page audit checklist. |
| `cs-data-security` | Data security | The trust-boundary framing of `data-security.mdx` — server as source of truth, why players can't be trusted, and what is safe to trust. |
| `cs-server-authority` | Server authority | Authority patterns: recomputation on the server, ownership verification, client-only reports, and the authority playbook. |
| `cs-shield-test` | The shield test | Optional: a spectator/probe build that attempts to forge a completion, a guest id, or an XP row against a clean game and logs the result. Tie it to the hardening prompt's findings so the lesson and the code changes point at the same problems. |

Rules for §3:
- Frontmatter is mandatory on every file (the course build fails on missing frontmatter — confirm by reading an existing lesson's header).
- `sectionId` = `anti-cheat`, `order` = continuous numbering within that section (1..7), `difficulty` = `intermediate` for all, `tags` should include `security` and `anti-cheat`.
- Write objectives that name what a learner can do after the lesson; grade the steps fairly so the medal total is achievable but meaningful.
- If the course's step components don't support a tag you want to use, drop the tag rather than guess — verify the component list first.

## 4. Prerequisites and sequencing

- Wire `prerequisites` on the new lessons against existing slugs so the course's flow reads correctly. Example: `cs-rate-limiting-and-spam` → `[cs-understanding-trust-boundaries]`; `cs-identity-proof` → `[cs-rate-limiting-and-spam, cs-understanding-trust-boundaries]`; the lab and the shield test → `[cs-security-audit, cs-server-authority]`.
- The shield test, identity proof, and the lab reference the app's hardening work (Finding B in the earlier task); the lesson text should not depend on a release, so write it as a generic playbook until the app lands.
- Update `prerequisites` on the **existing** `data` lessons that now live under the new section? No — leave existing non-moved prerequisites alone. Only add prerequisites to the new lessons you create.

## 5. Syllabus / menu / index updates

Check whether `src/components/home/lesson-list.tsx` or a similar menu component renders sections from `getCourseStructure()` — if it does, no text change is needed; the new section and its lessons will appear automatically. If a static menu or terms page lists the section set, add the new section there.

Do not touch `README.md` or `CHANGELOG.md` as part of this task — the course tooling keeps the lesson count fresh, and I'll add the changelog entry in a separate commit.

## 6. Verification

After editing, run on the repo root, in order, and report each real exit code:

1. `npx tsc --noEmit --incremental false`
2. `npx eslint .`
3. `npm run build`

Then start a dev server (`npm run dev`) and request each new lesson slug from a browser — e.g. `GET /en/lessons/cs-understanding-trust-boundaries` — and confirm **200 with lesson content**, not a server error. The build will **not** prove lesson rendering (dynamic routes do not prerender), so the dev-server request is the real content check. Also confirm the four moved lessons return 200 from their slugs.

Report, per lesson, whether the slug is valid, the frontmatter is complete, and the server returned 200. If any step throws a runtime/MDX compile error, list the exact slug and error.

## 7. Report

For each of the seven new lessons and each of the four moved lessons: file path, frontmatter diff, `order` assigned, server-rendered 200 status, and the changelog line (in the same work, in the format already used in `CHANGELOG.md`). State explicitly which checks were exercised and which were only reviewed statically. Do not commit or push.
