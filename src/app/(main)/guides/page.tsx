import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, Gamepad2, GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "Guides — Learn Luau & Roblox Development",
  description:
    "Free guides for Roblox development: how to make a game in Roblox, Roblox scripting for beginners, and what Luau is.",
  alternates: { canonical: "/guides" },
};

const guides = [
  {
    href: "/guides/how-to-make-a-game-in-roblox",
    icon: Gamepad2,
    title: "How to Make a Game in Roblox",
    description:
      "The complete beginner path: install Studio, write your first scripts, build a real game, and publish it.",
  },
  {
    href: "/guides/roblox-scripting-for-beginners",
    icon: BookOpen,
    title: "Roblox Scripting for Beginners",
    description:
      "Learn Luau from absolute zero — variables, functions, loops, events, and debugging — with hands-on practice.",
  },
  {
    href: "/guides/what-is-luau",
    icon: GraduationCap,
    title: "What Is Luau?",
    description:
      "The scripting language behind every Roblox game, explained: where it came from, how it works, and how to start.",
  },
];

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
      <p className="mt-2 text-muted-foreground">
        Short, practical guides to Roblox development. Each one links straight
        into the free course when you&apos;re ready to start building.
      </p>

      <div className="mt-8 grid gap-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <guide.icon className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold group-hover:underline">
                    {guide.title}
                  </h2>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {guide.description}
                </p>
              </div>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
