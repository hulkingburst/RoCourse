# RoCourse

> **Free forever.** No paywall, no sign-up required — all 52 lessons are open and free to use. Accounts are 100% optional and exist only to sync your progress across devices.
>
> **Built with AI, reviewed by a human.** This site is developed with AI assistance to keep it free and open source — every lesson, activity, and feature is then reviewed and managed by a human before it ships.

**RoCourse** is a free, interactive course for learning Luau by building real Roblox games — not by copying tutorials. It turns a full ~52-lesson curriculum into Mimo-style micro-lessons: one short step at a time, one activity per step, solved-activity gating, and auto-saved progress with locked lessons that unlock in order.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and `next-mdx-remote-client`. Lessons are plain MDX files compiled at build time into static pages.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Production builds:

```bash
npm run build
npm run start
```

Quality checks:

```bash
npx eslint
```

The site runs fully without any accounts. To enable optional account sync you
need a Postgres database and a couple of environment variables (see
[Accounts & progress sync](#accounts--progress-sync) and `.env.example`).

## How lessons work

- Lessons live in `content/lessons/*.mdx` as one file per lesson. Each file starts with YAML frontmatter (`slug`, `title`, `description`, `sectionId`, `order`, `difficulty`, `estimatedMinutes`, `tags`, `objectives`, `prerequisites`, `keywords`).
- Every lesson is a sequence of `<Step>…</Step>` blocks rendered by a stepper (`LessonStepper`). The reader sees one step at a time and cannot continue past an unsolved activity.
- The course map and section order live in `content/course.ts`; `getCourseStructure()` in `src/lib/lessons.ts` merges the map with the lesson files.
- Because MDX compile-tree walking can't see `<Step>` boundaries, `src/lib/steps.ts` splits the raw MDX source by regex (`splitLessonSource` + `detectActivity` + `maskFences`) and the lesson page compiles each step chunk separately.
- Progress (solved activities per lesson) is stored in localStorage via `src/lib/progress-store.ts`. Lessons are locked unless the previous lesson in reading order is complete.
- Guests keep working exactly as before — progress is stored locally, never blocked, never gated.

### Authoring rule

**One activity per `<Step>`.** A step unlocks "Continue" only when its single activity is solved. Keep steps short — a concept, a tiny example, and often one activity. Use `<Note>`, `<Warning>`, and `<Expandable>` sparingly.

MDX gotcha: `\"` escapes inside plain double-quoted JSX attributes fail to compile. Use single quotes (`starterCode='...'`) or backtick JSX expressions (`prompt={\`...\`}`) instead.

### Available components

All custom components are registered in `src/content/mdx-components.tsx`:

- `<Step>` — a step in the lesson stepper
- Activities (each must sit inside its own step): `<Mcq>`, `<FillBlank>`, `<WriteCode>`, `<PredictOutput>`, `<FixBug>`, `<ArrangeCode>`
- Extras: `<Callout>`, `<Expandable>`, `<Note>`, `<Tip>`, `<Warning>`, `<Mistake>`, `<Quiz>`, `<Challenge>`, plus a `<CodeBlock>` renderer for fenced code and custom heading/link rendering

## Project structure

```
content/
  course.ts                 course map, section order, branding constants
  lessons/*.mdx             one MDX lesson per file
prisma/
  schema.prisma             User, ProgressProfile, CourseCompletion models
src/
  app/                      Next.js App Router pages (home, lesson, search, profile)
    api/auth/[...nextauth]  Auth.js credentials handlers
    api/sync/               progress sync API (GET pull, POST push)
  components/
    activities/             the six activity components
    auth/                   sign-in dialog, account menu, sync host
    layout/                 site header, course sidebar, app shell
    lessons/                step, quiz, prediction, code block, MDX extras
    home/                   lesson list, course overview
    profile/                profile page UI
  content/mdx-components.tsx  MDX component registry
  lib/
    steps.ts                source-level step splitter for MDX
    lessons.ts              course structure + lesson loading
    progress-store.ts       solved-activity progress (localStorage, zustand)
    sync.ts / sync-api.ts   client sync engine / server data access
    auth.ts, auth-actions.ts  Auth.js config + account creation action
    prisma.ts               Prisma client singleton
```

## Configuration

The visible site name defaults to `RoCourse`. Override it without editing code via the `NEXT_PUBLIC_COURSE_NAME` environment variable (used by the header, sidebar, and footer).

## Accounts & progress sync

Accounts are an optional convenience layer. Guests get the full course with local
progress; signing in lets you continue on another device.

- **No sign-up wall** — every lesson, activity, and feature works without an account.
- **Cloud sync** — when you sign in, local progress is offered for upload (or the
  cloud copy is pulled down). If both sides changed, you choose which to keep.
- **No social features** — no profiles to follow, no leaderboards, no public stats,
  no paywalls, and no donation advantages. This is a learning site, not a social one.
- **Future resource library** — a community-reviewed library of curated Roblox/Luau
  resources (tutorials, tools, free assets) is planned but not yet implemented.

### Local setup

Create a Postgres database and a `.env` file based on `.env.example`:

```
DATABASE_URL="postgresql://..."
AUTH_SECRET="<random hex, e.g. openssl rand -base64 32>"
AUTH_TRUST_HOST=true
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
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Sign in with Google" | Optional — omit to disable |
| `GITHUB_ID` / `GITHUB_SECRET` | "Sign in with GitHub" | Optional — omit to disable |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | "Sign in with Discord" | Optional — omit to disable |

Everything else (lessons, activities, search, static pages) ignores these
variables, and `next build` succeeds without them. OAuth sign-in buttons only
appear for providers you configure.

**OAuth setup:** create an app in each provider's developer console and add the
callback URL `https://<your-site>/api/auth/callback/{provider}` (e.g.
`.../api/auth/callback/google`; for local dev, `http://localhost:3000/api/auth/callback/google`).
A provider email matching an existing email+password account adopts that account,
so signing in with Google later keeps the same progress.

## Deploying

This is a standard static-friendly Next.js app. `next build` prerenders every lesson as static HTML. Deploy the `.next` output on Vercel, Netlify, or any Node host that supports Next.js. The `api/*` routes and account sync need the env vars above and a reachable database.
