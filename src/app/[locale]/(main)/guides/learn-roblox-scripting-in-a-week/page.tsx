import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { getAllLessonMetas } from "@/lib/lessons";
import type { LessonMeta } from "@/lib/types";

export const metadata: Metadata = {
  title: "Learn Roblox Scripting in a Week — 7-Day Plan",
  description:
    "A 7-day plan to complete the free RoCourse from zero to a published Roblox game: a step-by-step schedule that takes about an hour a day.",
  alternates: { canonical: "/guides/learn-roblox-scripting-in-a-week" },
};

const days = [
  {
    day: 1,
    theme: "Meet Studio",
    weight: "light",
    summary:
      "Install Roblox Studio, find your way around, write your very first script, and make your first bug-hunt fixes. No code experience needed.",
    slugs: [
      "welcome",
      "installing-studio",
      "studio-interface",
      "workspace-parts",
      "play-testing",
      "output-errors",
      "bug-hunt-first",
    ],
  },
  {
    day: 2,
    theme: "Speak Luau",
    weight: "full",
    summary:
      "The core vocabulary of every script: variables, types, numbers, strings, booleans, and functions that return answers.",
    slugs: [
      "recap-studio",
      "scripts",
      "variables",
      "variable-naming",
      "types",
      "numbers",
      "strings",
      "booleans",
      "functions",
      "function-returns",
    ],
  },
  {
    day: 3,
    theme: "Control the flow",
    weight: "full",
    summary:
      "Make your code decide and repeat: conditionals, loops, for loops, tables, timing, comments, and events. Ends with a bug hunt.",
    slugs: [
      "conditionals",
      "loops",
      "for-loops",
      "tables",
      "task-wait",
      "comments",
      "events",
      "bug-hunt-basics",
      "arrange-code-basics",
    ],
  },
  {
    day: 4,
    theme: "Data that persists",
    weight: "full",
    summary:
      "Leaderboards, saving between visits with DataStores, and why the server — never the client — is the source of truth.",
    slugs: [
      "recap-basics",
      "leaderstats",
      "player-added",
      "user-id",
      "datastores",
      "loading-data",
      "save-loop",
      "data-security",
      "remotes",
      "bug-hunt-data",
    ],
  },
  {
    day: 5,
    theme: "Build game systems",
    weight: "full",
    summary:
      "Turn clicking into coins: GUIs, UDim2, styling, the clicker loop, idle income, upgrades, the shop panel, and ModuleScripts.",
    slugs: [
      "recap-data",
      "guis",
      "udim2",
      "gui-styling",
      "clicker",
      "idle-loop",
      "upgrades",
      "shop-ui",
      "modules",
      "bug-hunt-systems",
      "arrange-shop",
    ],
  },
  {
    day: 6,
    theme: "Bring the world to life",
    weight: "medium",
    summary:
      "Players and their characters, building the world in code, attributes, sounds, and smooth tweens. A slightly lighter day — finish it with a bug hunt.",
    slugs: [
      "recap-gameplay",
      "players",
      "characters",
      "instances",
      "attributes",
      "sounds",
      "tweens",
      "bug-hunt-world",
      "arrange-tween",
    ],
  },
  {
    day: 7,
    theme: "Ship it",
    weight: "finish",
    summary:
      "Publish your game and switch on real saves, then level up your debugging skills and build the complete final project — one playable game.",
    slugs: [
      "recap-objects",
      "publishing",
      "sharing-permissions",
      "datastore-testing",
      "recap-publishing",
      "debugging",
      "print-debugging",
      "common-errors",
      "next-steps",
      "recap-course",
      "final-project",
    ],
  },
];

function getPlanData() {  const bySlug = new Map(getAllLessonMetas().map((meta) => [meta.slug, meta]));
  const plan = days.map((day) => {
    const metas = day.slugs
      .map((slug) => bySlug.get(slug))
      .filter((meta): meta is LessonMeta => meta !== undefined);
    const minutes = metas.reduce((sum, meta) => sum + meta.estimatedMinutes, 0);
    return { ...day, metas, minutes };
  });
  return { plan, totalMinutes: plan.reduce((sum, day) => sum + day.minutes, 0) };
}

const weightLabel: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  full: "Full day",
  finish: "Finish line",
};

const weightClass: Record<string, string> = {
  light: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  full: "bg-sky-500/10 text-sky-600",
  finish: "bg-primary/10 text-primary",
};

export default function LearnInAWeekGuide() {
  const { plan, totalMinutes } = getPlanData();

  const steps = plan.map((day) => ({
    "@type": "HowToStep" as const,
    name: `Day ${day.day}: ${day.theme}`,
    text: day.summary,
  }));

  const weekJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Learn Roblox Scripting in a Week",
    description:
      "A 7-day schedule to go from zero to a published Roblox game, following the free RoCourse.",
    totalTime: "PT6H",
    step: steps,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={weekJsonLd} />
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
        Guides
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        Learn Roblox Scripting in a Week
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        The whole free course, one day at a time. Roughly{" "}
        <strong>{Math.round(totalMinutes / 60)} hours</strong> of guided lessons
        spread across 7 days — with lighter days built in so you don&apos;t burn
        out.
      </p>

      <div className="mt-8 space-y-4">
        {plan.map((day) => (
          <div key={day.day} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {day.day}
              </span>
              <h2 className="text-lg font-semibold">
                {day.theme}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${weightClass[day.weight]}`}
              >
                {weightLabel[day.weight]} · ~{day.minutes} min
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{day.summary}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {day.metas.map((meta) => (
                <li key={meta.slug}>
                  <Link
                    href={`/lessons/${meta.slug}`}
                    className="inline-block rounded-md border bg-muted px-2 py-1 text-xs transition-colors hover:bg-accent"
                  >
                    {meta.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="prose prose-sm mt-10 max-w-none text-[15px] leading-relaxed">
        <h2>How to use this plan</h2>
        <ul>
          <li>
            Do the lessons in order, and don&apos;t rush — the{" "}
            <strong>recap</strong> and <strong>bug-hunt</strong> lessons are
            where the learning sticks.
          </li>
          <li>
            On the full days, take a short break between every two or three
            lessons.
          </li>
          <li>
            Type every example out yourself instead of copying. You&apos;ll hit
            typos — that&apos;s good practice, not a failure.
          </li>
          <li>
            Use the <Link href="/playground">Luau playground</Link> to
            experiment with anything that feels fuzzy.
          </li>
        </ul>

        <h2>Behind by a day?</h2>
        <p>
          The plan has slack built in: if a day runs long, skip nothing from
          that day but keep your pace. The <strong>recap</strong> and{" "}
          <strong>arrange</strong> (drag-and-drop) lessons are the easiest to
          compress if you&apos;re truly pressed for time.
        </p>

        <h2>Why this order works</h2>
        <p>
          Each section builds on the last: you learn the language before
          touching data, data before GUIs, and GUIs before the client-server
          bridge. By day 7 you&apos;ve assembled every system into one complete,
          publishable game — see the{" "}
          <Link href="/lessons/final-project">final project</Link>.
        </p>
      </div>
    </div>
  );
}
