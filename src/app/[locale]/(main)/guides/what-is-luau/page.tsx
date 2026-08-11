import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "What Is Luau? The Roblox Scripting Language, Explained",
  description:
    "Luau is the scripting language behind every Roblox game. Learn what it is, how it relates to Lua, what makes it beginner-friendly, and how to start coding with it.",
  alternates: { canonical: "/guides/what-is-luau" },
};

const luauJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What Is Luau? The Roblox Scripting Language, Explained",
  description:
    "Luau is the scripting language behind every Roblox game. Learn what it is, how it relates to Lua, and how to start coding with it.",
  inLanguage: "en",
  isAccessibleForFree: true,
  author: {
    "@type": "Organization",
    name: "RoCourse",
    url: SITE_URL,
  },
};

export default function WhatIsLuauGuide() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={luauJsonLd} />
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
        Guides
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        What Is Luau?
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        The scripting language behind every Roblox game — where it came from,
        why it&apos;s great for beginners, and how to write your first line.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <h2>Luau is Roblox&apos;s language</h2>
        <p>
          Every Roblox game is powered by <strong>Luau</strong> (pronounced
          &ldquo;loo-ow&rdquo;). It&apos;s the language scripts use inside
          Roblox Studio, from the simplest clicker to the biggest experiences
          on the platform. If you want to build Roblox games, Luau is the
          language you&apos;ll write.
        </p>

        <h2>Luau is a faster, safer Lua</h2>
        <p>
          Luau started as <strong>Lua</strong>, a small, famously
          beginner-friendly programming language. Roblox took Lua and made it
          faster and safer for game development — adding things like{" "}
          <strong>optional type checking</strong> (so the computer can catch
          many mistakes before you even run the game) and heavy performance
          work. The result: a language that&apos;s easy to start with but
          scales to huge, complex games.
        </p>
        <p>
          Because it&apos;s based on Lua, the ideas you learn — variables,
          functions, loops, tables — are the same ones used across game dev,
          scripting, and even big tech. Learning Luau isn&apos;t a dead end;
          it&apos;s a real introduction to programming.
        </p>

        <h2>Where Luau runs</h2>
        <ul>
          <li>
            <strong>In games</strong> — server scripts, local scripts, and
            ModuleScripts inside your Roblox places.
          </li>
          <li>
            <strong>In Studio</strong> — the command bar and plugins are Luau.
          </li>
          <li>
            <strong>In your browser</strong> — the{" "}
            <Link href="/playground">RoCourse playground</Link> runs real Luau
            without installing anything.
          </li>
        </ul>

        <h2>What makes Luau beginner-friendly</h2>
        <ul>
          <li>
            <strong>Instant feedback.</strong> Play the game and see results
            immediately.
          </li>
          <li>
            <strong>Readable errors.</strong> The Output window tells you the
            line number and what went wrong.
          </li>
          <li>
            <strong>Gradual typing.</strong> You can write plain dynamic code
            and add types as you grow.
          </li>
          <li>
            <strong>Built-in tools.</strong> Saving, physics, and rendering are
            handled for you — you focus on the fun parts.
          </li>
        </ul>

        <h2>Start writing Luau today</h2>
        <p>
          Open the{" "}
          <Link href="/playground">Luau playground</Link> and try{" "}
          <code>print(&quot;Hello, Luau!&quot;)</code>, then skim the{" "}
          <Link href="/reference">Luau cheat sheet</Link>. When you want to
          build in a real game, the{" "}
          <Link href="/lessons">free course</Link> teaches Luau from absolute
          zero — variables, functions, loops, events, and a complete game — no
          experience or account required.
        </p>
      </div>
    </div>
  );
}
