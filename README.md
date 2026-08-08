# RoCourse

**Learn Luau by building real Roblox games — one tiny step at a time.**

RoCourse is a free, interactive course that treats you like a builder, not a
spectator. No copy-paste tutorials, no walls of theory. You assemble real game
code yourself, one short step at a time, and the course only moves forward when
you actually solve each activity.

**Free forever. No paywall, no sign-up wall, no tricks.** All 52 lessons, every
activity type, and the full Luau playground work without an account. Accounts
are optional and exist purely to sync your progress across devices.

> Built with AI, reviewed by a human. The course is developed with AI
> assistance to stay free and open — and every lesson, activity, and feature is
> then reviewed and managed by a human before it ships.

## Why you'll actually finish

- **Micro-lessons, not lectures.** Every lesson is a chain of tiny steps: a
  concept, a tiny example, one activity. You're never more than a minute from
  the next win.
- **Solved-activity gating.** Lessons lock in order — the next step unlocks only
  when you've solved the current one. No skipping ahead, no fake progress.
- **Autosaved progress.** Everything saves as you go, and it syncs to the cloud
  the moment you sign in.

## What's inside

- **52 lessons across two complete games** — a Coin Tycoon and a collection
  game — covering real Roblox Studio workflows and Luau fundamentals.
- **Six activity types** that make you write, predict, fix, and arrange real
  code: multiple choice, fill-in-the-blank, write-the-code, predict-the-output,
  fix-the-bug, and arrange-the-code.
- **A live Luau playground** running in your browser, so you can experiment
  anywhere in the course.
- **Daily challenges and a final certificate** to keep your streak alive and
  celebrate the finish line.
- **A Luau reference and a learner directory** for quick lookups — including
  public progress profiles that never expose your email.
- **Optional cloud sync** so your progress follows you across devices.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The entire course runs
with zero accounts and zero configuration.

Production build:

```bash
npm run build
npm run start
```

Quality checks: `npx eslint`

## How the course works

- Lessons live in `content/lessons/*.mdx` as one file per lesson. Each file
  starts with YAML frontmatter (`slug`, `title`, `description`, `sectionId`,
  `order`, `difficulty`, `estimatedMinutes`, `tags`, `objectives`,
  `prerequisites`, `keywords`).
- Every lesson is a sequence of `<Step>…</Step>` blocks rendered by a stepper
  (`LessonStepper`). The reader sees one step at a time and cannot continue past
  an unsolved activity.
- The course map and section order live in `content/course.ts`;
  `getCourseStructure()` in `src/lib/lessons.ts` merges the map with the lesson
  files.
- Because MDX compile-tree walking can't see `<Step>` boundaries,
  `src/lib/steps.ts` splits the raw MDX source by regex (`splitLessonSource` +
  `detectActivity` + `maskFences`) and the lesson page compiles each step chunk
  separately.
- Progress (solved activities per lesson) is stored in localStorage via
  `src/lib/progress-store.ts`. Lessons are locked unless the previous lesson in
  reading order is complete.
- Guests keep working exactly as before — progress is stored locally, never
  blocked, never gated.

### Authoring rule

**One activity per `<Step>`.** A step unlocks "Continue" only when its single
activity is solved. Keep steps short — a concept, a tiny example, and often one
activity. Use `<Note>`, `<Warning>`, and `<Expandable>` sparingly.

MDX gotcha: `\"` escapes inside plain double-quoted JSX attributes fail to
compile. Use single quotes (`starterCode='...'`) or backtick JSX expressions
(`prompt={\`...\`}`) instead.

### Available components

All custom components are registered in `src/content/mdx-components.tsx`:

- `<Step>` — a step in the lesson stepper
- Activities (each must sit inside its own step): `<Mcq>`, `<FillBlank>`,
  `<WriteCode>`, `<PredictOutput>`, `<FixBug>`, `<ArrangeCode>`
- Extras: `<Callout>`, `<Expandable>`, `<Note>`, `<Tip>`, `<Warning>`,
  `<Mistake>`, `<Quiz>`, `<Challenge>`, plus a `<CodeBlock>` renderer for
  fenced code and custom heading/link rendering

## Project structure

```
content/
  course.ts                 course map, section order, branding constants
  lessons/*.mdx             one MDX lesson per file
prisma/
  schema.prisma             User, ProgressProfile, CourseCompletion models
src/
  app/                      Next.js App Router pages (home, lesson, search,
    api/auth/[...nextauth]  Auth.js credentials handlers
    api/sync/               progress sync API (GET pull, POST push)
  components/
    activities/             the six activity components
    auth/                   sign-in dialog, account menu, sync host
    layout/                 site header, course sidebar, app shell
    lessons/                step, quiz, prediction, code block, MDX extras
    home/                   lesson list, course overview
    profile/                profile page UI
    reference/              Luau reference, search + copy
    users/                  learner directory
  content/mdx-components.tsx  MDX component registry
  lib/
    steps.ts                source-level step splitter for MDX
    lessons.ts              course structure + lesson loading
    progress-store.ts       solved-activity progress (localStorage, zustand)
    sync.ts / sync-api.ts   client sync engine / server data access
    auth.ts, auth-actions.ts  Auth.js config + account creation action
    prisma.ts               Prisma client singleton
mobile/                     Capacitor/Android wrapper for the live site
```

## Android app

A thin [Capacitor](https://capacitorjs.com) wrapper in `mobile/` packages the
live site as a native Android app — the APK loads `ro-course.vercel.app`, so it
always shows the latest build with no reinstall. Rebuild it with:

```bash
cd mobile
npm install
npx cap add android      # once
cd android
.\gradlew.bat assembleDebug
```

The debug APK lands in `mobile/android/app/build/outputs/apk/debug/` and can be
sideloaded directly. Publishing to the Play Store needs a release signing key.

## Configuration

The visible site name defaults to `RoCourse`. Override it without editing code
via the `NEXT_PUBLIC_COURSE_NAME` environment variable (used by the header,
sidebar, and footer).

## Accounts & progress sync

Accounts are an optional convenience layer. Guests get the full course with
local progress; signing in lets you continue on another device.

- **No sign-up wall** — every lesson, activity, and feature works without an
  account.
- **Cloud sync** — when you sign in, local progress is offered for upload (or
  the cloud copy is pulled down). If both sides changed, you choose which to
  keep.
- **Privacy by default** — public profiles are opt-in via a handle, and your
  email is never shown publicly (it's masked even on your own profile until you
  reveal it).
- **Learner directory** — `/users` lists public profiles (`/u/<handle>`) with
  progress stats and completions, so learners can show what they've built.
- **Community resources** — a hand-vetted library of Roblox/Luau development
  assets on `/resources`, built from submissions the course author personally
  reviews (see the section below).

### Local setup

Create a Postgres database and a `.env` file based on `.env.example`:

```
DATABASE_URL="postgresql://..."
AUTH_SECRET="<random hex, e.g. openssl rand -base64 32>"
AUTH_TRUST_HOST=true
BLOB_READ_WRITE_TOKEN="<paste from your Vercel Blob store>"  # required for /submit
```

Then apply the schema:

```bash
npx prisma migrate dev
```

| Variable | Required for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Accounts & sync | Postgres connection string (Vercel Postgres / Neon / etc.) |
| `DATABASE_URL_UNPOOLED` | Migrations | Direct connection when `DATABASE_URL` uses a pooler (Neon `-pooler`) |
| `AUTH_SECRET` | Auth.js sessions | Used to sign JWT session tokens |
| `AUTH_TRUST_HOST` | Hosted deployments | Set `true` on Vercel/Netlify |
| `BLOB_READ_WRITE_TOKEN` | Resources | Vercel Blob store token; auto-added when you create a store, paste locally for dev |
| `FEEDBACK_GITHUB_TOKEN` | Feedback & resources | Fine-grained PAT with Issues read/write on the feedback repo |
| `RESOURCES_GITHUB_REPO` | Resources | Optional; defaults to `hulkingburst/rocourse-feedback` |

Everything else (lessons, activities, search, static pages) ignores these
variables, and `next build` succeeds without them.

## Community resources

The `/resources` page is a small, hand-vetted library of Roblox/Luau
development assets — scripts, asset packs, UI modules, and models. Everything
listed there has been reviewed by the course author first. It exists because
the Roblox Toolbox is uncurated; this is the opposite.

How submissions flow:

1. A learner fills in `/submit` on the site: type, name, description, optional
   credit, and one of a `.zip` asset pack, pasted code, or a website link.
2. Zips are inspected in the browser before upload — only image and 3D/model
   file types are allowed inside (`png`, `jpg`, `fbx`, `obj`, and similar),
   with caps on entry count and unpacked size. Code is stored as plain text
   and never executed. Website links must be `http`/`https` and are rendered
   as external links on the catalog.
3. The submission lands as a GitHub issue in the private feedback repo,
   labeled `needs-review` (only you can see it).
4. You review it. Close the issue with the `accepted` label to publish it —
   it shows up on `/resources` within about a minute. Close with `rejected`
   to turn it down.

Implementation notes:

- Storage is a Vercel Blob store; zips upload straight from the browser (no
  server-side size limits). Create the store in the Vercel dashboard — the
  `BLOB_READ_WRITE_TOKEN` environment variable is added to the project
  automatically.
- The Resources page reads accepted issues back through the existing
  `FEEDBACK_GITHUB_TOKEN` (same private repo, labels keep feedback and
  resources apart), so no extra token, repo, or webhook is needed. Override
  the destination repo with `RESOURCES_GITHUB_REPO`.
- Submissions are soft rate-limited per IP on both `/api/resources/submit` and
  `/api/resources/upload`.

## Deploying

This is a standard static-friendly Next.js app. `next build` prerenders every
lesson as static HTML. Deploy the `.next` output on Vercel, Netlify, or any
Node host that supports Next.js. The `api/*` routes and account sync need the
env vars above and a reachable database.

## License

RoCourse is source-available under the
[PolyForm Strict License 1.0.0](./LICENSE).

Plainly: the source is fully public on GitHub, and you're welcome to read it,
run it, and learn from it for any noncommercial purpose. What the license
protects is the work itself — you may **not** redistribute the code or build
derivative versions of it (including the course content) as your own, and
commercial use requires permission. It's open eyes, not open season.
