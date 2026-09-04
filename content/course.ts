import type { CourseSectionConfig } from "@/lib/types";

/**
 * The course outline. Sections appear in the sidebar in this order.
 * Lesson files in `content/lessons/` reference a section via their `sectionId`.
 *
 * Adding a new section here + a `content/lessons/*.mdx` file with the matching
 * `sectionId` is all that's needed to grow the course.
 */
export const courseSections: CourseSectionConfig[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description:
      "Install Roblox Studio and learn to find your way around it before writing a single line of code.",
    order: 0,
  },
  {
    id: "luau-basics",
    title: "Luau Basics",
    description:
      "The building blocks of every script: variables, types, functions, conditionals, loops, tables, timing, and events.",
    order: 1,
  },
  {
    id: "data",
    title: "Player Data",
    description:
      "Leaderboards, saving between visits, and why the server — never the client — is the source of truth.",
    order: 2,
  },
  {
    id: "gameplay",
    title: "Game Systems",
    description:
      "Build a working clicker game: GUIs, currency, upgrades, and the client-server bridge that keeps it secure.",
    order: 3,
  },
  {
    id: "objects",
    title: "World & Players",
    description:
      "Parts, attributes, sounds, players and their characters, and smooth tweens that make the world feel alive.",
    order: 4,
  },
  {
    id: "publishing",
    title: "Publishing & Testing",
    description:
      "Put your game online, enable real data store saves, and run the full persistence loop.",
    order: 5,
  },
  {
    id: "leveling-up",
    title: "Leveling Up",
    description:
      "Read errors like a pro, debug systematically, and map what comes after this course.",
    order: 6,
  },
  {
    id: "final-project",
    title: "Final Project",
    description:
      "Assemble every system into one complete, publishable clicker game — then run the playtest that proves it works.",
    order: 7,
  },
  {
    id: "advanced-studio",
    title: "Advanced Studio",
    description:
      "Go beyond scripting the game: render live 3D previews with ViewportFrames and build your own Roblox Studio plugins.",
    order: 8,
  },
];

export const courseName = "RoCourse";
export const courseTagline =
  "Learn to build real Roblox games by understanding how the code works — not by copying tutorials.";
