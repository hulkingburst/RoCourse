import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "How to Make a Game in Roblox — Beginner's Guide",
  description:
    "A step-by-step guide to making your first Roblox game: install Roblox Studio, learn the basics of Luau scripting, build a real project, and publish it.",
  alternates: { canonical: "/guides/how-to-make-a-game-in-roblox" },
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Make a Game in Roblox",
  description:
    "A step-by-step beginner's guide to building and publishing your first Roblox game with Luau scripting.",
  totalTime: "PT12H",
  step: [
    {
      "@type": "HowToStep",
      name: "Install Roblox Studio",
      text: "Download the free Roblox Studio editor and sign in with your Roblox account.",
    },
    {
      "@type": "HowToStep",
      name: "Learn the essentials of Luau",
      text: "Learn variables, functions, loops, and events — the building blocks of every Roblox script.",
    },
    {
      "@type": "HowToStep",
      name: "Build a real game project",
      text: "Follow a complete project that teaches you to make a playable game step by step.",
    },
    {
      "@type": "HowToStep",
      name: "Publish your game",
      text: "Upload your finished game to Roblox and share it with players.",
    },
  ],
};

export default function MakeAGameGuide() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={howToJsonLd} />
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
        Guides
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        How to Make a Game in Roblox
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        The whole path from &ldquo;I&apos;ve never touched Roblox Studio&rdquo;
        to &ldquo;my game is online&rdquo; — laid out in four steps.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <h2>1. Install Roblox Studio</h2>
        <p>
          Every Roblox game is built in{" "}
          <strong>Roblox Studio</strong>, the free editor Roblox provides. You
          build your world out of parts, then make it interactive by writing
          scripts in a language called{" "}
          <Link href="/guides/what-is-luau">Luau</Link>. Studio is free — you
          just need a Roblox account to sign in. Our{" "}
          <Link href="/lessons/installing-studio">
            Installing Studio lesson
          </Link>{" "}
          walks you through the download and first launch.
        </p>

        <h2>2. Learn the essentials of Luau scripting</h2>
        <p>
          A game without code is just a diorama. Scripting is what lets a
          player walk, click, earn coins, and open doors. You don&apos;t need a
          computer science degree — the core ideas fit on one hand:
        </p>
        <ul>
          <li>
            <Link href="/lessons/variables">Variables</Link> — remember things
            like coins and health.
          </li>
          <li>
            <Link href="/lessons/functions">Functions</Link> — reusable
            instructions you can run over and over.
          </li>
          <li>
            <Link href="/lessons/loops">Loops</Link> — repeat an action, like
            giving income every second.
          </li>
          <li>
            <Link href="/lessons/conditionals">Conditionals</Link> — make
            decisions (&ldquo;if the player has enough coins&hellip;&rdquo;).
          </li>
          <li>
            <Link href="/lessons/events">Events</Link> — react to the world,
            like a player touching a part.
          </li>
        </ul>
        <p>
          The RoCourse course teaches every one of these with real game code,
          one small step at a time — no copy-pasting, no walls of theory.
        </p>

        <h2>3. Build a real game project</h2>
        <p>
          The fastest way to learn is to make something that actually works.
          The course is built around a complete project: a{" "}
          <strong>Coin Tycoon</strong> where you click to earn coins, buy
          upgrades, save your progress, and polish everything with sounds and
          animations. You end with a game you can genuinely play — see the{" "}
          <Link href="/lessons/final-project">final project</Link>.
        </p>

        <h2>4. Publish your game</h2>
        <p>
          When it&apos;s ready, publishing takes a few clicks inside Studio:
          name your game, pick a thumbnail, and hit publish. Anyone on Roblox
          can then play it. Our{" "}
          <Link href="/lessons/publishing">Publishing lesson</Link> covers the
          full process, including permissions and sharing settings.
        </p>

        <h2>Ready to start?</h2>
        <p>
          The fastest route is to take the course. It&apos;s{" "}
          <strong>free, requires no account</strong>, and starts from absolute
          zero. Begin with the{" "}
          <Link href="/lessons/welcome">welcome lesson</Link>, and use the{" "}
          <Link href="/playground">Luau playground</Link> to experiment as you
          learn.
        </p>
      </div>
    </div>
  );
}
