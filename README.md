# RoCourse

> **Free forever.** No accounts, no paywall, no sign-up — all 52 lessons are open and free to use.
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
npm run lint
```

## How lessons work

- Lessons live in `content/lessons/*.mdx` as one file per lesson. Each file starts with YAML frontmatter (`slug`, `title`, `description`, `sectionId`, `order`, `difficulty`, `estimatedMinutes`, `tags`, `objectives`, `prerequisites`, `keywords`).
- Every lesson is a sequence of `<Step>…</Step>` blocks rendered by a stepper (`LessonStepper`). The reader sees one step at a time and cannot continue past an unsolved activity.
- The course map and section order live in `content/course.ts`; `getCourseStructure()` in `src/lib/lessons.ts` merges the map with the lesson files.
- Because MDX compile-tree walking can't see `<Step>` boundaries, `src/lib/steps.ts` splits the raw MDX source by regex (`splitLessonSource` + `detectActivity` + `maskFences`) and the lesson page compiles each step chunk separately.
- Progress (solved activities per lesson) is stored in localStorage via `src/lib/progress-store.ts`. Lessons are locked unless the previous lesson in reading order is complete.

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
src/
  app/                      Next.js App Router pages (home, lesson, search)
  components/
    activities/             the six activity components
    layout/                 site header, course sidebar, app shell
    lessons/                step, quiz, prediction, code block, MDX extras
    home/                   lesson list, course overview
  content/mdx-components.tsx  MDX component registry
  lib/
    steps.ts                source-level step splitter for MDX
    lessons.ts              course structure + lesson loading
    progress-store.ts       solved-activity progress (localStorage, zustand)
```

## Configuration

The visible site name defaults to `RoCourse`. Override it without editing code via the `NEXT_PUBLIC_COURSE_NAME` environment variable (used by the header, sidebar, and footer).

## Deploying

This is a standard static-friendly Next.js app. `next build` prerenders every lesson as static HTML. Deploy the `.next` output on Vercel, Netlify, or any Node host that supports Next.js.
